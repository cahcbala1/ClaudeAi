"""API de pedidos.

Quién ve qué:
- Administrador: todos los pedidos (con filtros).
- Mesero: solo los pedidos que él registró.
- Cocina: los pedidos que debe preparar (por defecto pendientes y en preparación).

Flujo de estados (quién puede hacer cada cambio):
    pendiente ──(cocina)──► en_preparacion ──(cocina)──► listo ──(mesero)──► entregado
        │
        └──(mesero dueño o administrador)──► cancelado
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from ..extensions import db
from ..models import ESTADOS, DetallePedido, Pedido, Producto
from ..utils.decorators import rol_requerido
from ..utils.validators import es_entero, error, leer_json, limpiar_descripcion, rango_de_fecha

bp = Blueprint("pedidos", __name__, url_prefix="/api/pedidos")

# Cambios de estado permitidos para cada rol: {rol: {estado_actual: {estados_nuevos}}}
TRANSICIONES = {
    "cocina": {
        "pendiente": {"en_preparacion"},
        "en_preparacion": {"listo"},
    },
    "mesero": {
        "pendiente": {"cancelado"},
        "listo": {"entregado"},
    },
    "admin": {
        "pendiente": {"cancelado"},
    },
}

# Estados que la cocina puede consultar y los que ve por defecto.
ESTADOS_COCINA = ("pendiente", "en_preparacion", "listo")
ESTADOS_COCINA_POR_DEFECTO = ("pendiente", "en_preparacion")

MESA_MAXIMA = 999
CANTIDAD_MAXIMA = 100


def puede_ver(usuario, pedido):
    """El mesero solo puede ver sus propios pedidos; admin y cocina ven todos."""
    return usuario.rol != "mesero" or pedido.usuario_id == usuario.id


def validar_detalles(detalles):
    """Valida la lista de productos del pedido.

    Devuelve (lineas, None) si todo es correcto, donde lineas es una lista de
    (producto, cantidad); o (None, mensaje_de_error) si algo falla.
    Si un producto se repite en la lista, se suman sus cantidades.
    """
    if not isinstance(detalles, list) or not detalles:
        return None, "El pedido debe incluir al menos un producto en 'detalles'"

    cantidades = {}  # producto_id -> cantidad total
    for posicion, item in enumerate(detalles, start=1):
        if not isinstance(item, dict):
            return None, f"Detalle {posicion}: debe ser un objeto con producto_id y cantidad"
        producto_id = item.get("producto_id")
        cantidad = item.get("cantidad")
        if not es_entero(producto_id):
            return None, f"Detalle {posicion}: producto_id debe ser un número entero"
        if not es_entero(cantidad) or not 1 <= cantidad <= CANTIDAD_MAXIMA:
            return None, f"Detalle {posicion}: la cantidad debe ser un entero entre 1 y {CANTIDAD_MAXIMA}"
        cantidades[producto_id] = cantidades.get(producto_id, 0) + cantidad

    lineas = []
    for producto_id, cantidad in cantidades.items():
        if cantidad > CANTIDAD_MAXIMA:
            return None, f"La cantidad total de un producto no puede superar {CANTIDAD_MAXIMA}"
        producto = db.session.get(Producto, producto_id)
        if producto is None:
            return None, f"El producto con id {producto_id} no existe"
        if not producto.disponible:
            return None, f"El producto '{producto.nombre}' no está disponible"
        lineas.append((producto, cantidad))
    return lineas, None


@bp.get("")
@jwt_required()
def listar():
    """Lista pedidos según el rol del usuario.

    Filtros opcionales: ?estado=pendiente  ?mesa=4  ?fecha=2026-11-24 (solo admin y mesero)
    """
    consulta = Pedido.query
    estado = request.args.get("estado")

    if estado and estado not in ESTADOS:
        return error(f"Estado inválido. Valores permitidos: {', '.join(ESTADOS)}")

    if current_user.rol == "mesero":
        consulta = consulta.filter(Pedido.usuario_id == current_user.id)
    elif current_user.rol == "cocina":
        if estado and estado not in ESTADOS_COCINA:
            return error(f"La cocina solo puede consultar: {', '.join(ESTADOS_COCINA)}")
        if not estado:
            consulta = consulta.filter(Pedido.estado.in_(ESTADOS_COCINA_POR_DEFECTO))

    if estado:
        consulta = consulta.filter(Pedido.estado == estado)

    mesa = request.args.get("mesa")
    if mesa:
        if not mesa.isdigit():
            return error("mesa debe ser un número entero")
        consulta = consulta.filter(Pedido.mesa == int(mesa))

    fecha = request.args.get("fecha")
    if fecha:
        rango = rango_de_fecha(fecha)
        if rango is None:
            return error("La fecha debe tener el formato AAAA-MM-DD")
        consulta = consulta.filter(Pedido.creado_en >= rango[0], Pedido.creado_en < rango[1])

    # La cocina atiende primero los pedidos más antiguos; los demás ven primero los recientes.
    if current_user.rol == "cocina":
        consulta = consulta.order_by(Pedido.creado_en.asc())
    else:
        consulta = consulta.order_by(Pedido.creado_en.desc())

    return jsonify([p.to_dict() for p in consulta.all()])


@bp.get("/<int:pedido_id>")
@jwt_required()
def obtener(pedido_id):
    pedido = db.session.get(Pedido, pedido_id)
    if pedido is None:
        return error("Pedido no encontrado", 404)
    if not puede_ver(current_user, pedido):
        return error("Solo puedes ver tus propios pedidos", 403)
    return jsonify(pedido.to_dict())


@bp.post("")
@rol_requerido("mesero")
def crear():
    """Registra un pedido.

    Cuerpo: {"mesa": 4, "observaciones": "sin cebolla",
             "detalles": [{"producto_id": 1, "cantidad": 2}, ...]}
    El precio de cada producto se toma de la base de datos (no del cliente).
    """
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    mesa = datos.get("mesa")
    if not es_entero(mesa) or not 1 <= mesa <= MESA_MAXIMA:
        return error(f"La mesa debe ser un número entero entre 1 y {MESA_MAXIMA}")

    observaciones = limpiar_descripcion(datos.get("observaciones"))
    if observaciones and len(observaciones) > 255:
        return error("Las observaciones no pueden superar los 255 caracteres")

    lineas, mensaje = validar_detalles(datos.get("detalles"))
    if mensaje:
        return error(mensaje)

    pedido = Pedido(mesa=mesa, observaciones=observaciones, usuario_id=current_user.id)
    total = 0
    for producto, cantidad in lineas:
        subtotal = producto.precio * cantidad
        pedido.detalles.append(
            DetallePedido(
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario=producto.precio,
                subtotal=subtotal,
            )
        )
        total += subtotal
    pedido.total = total

    db.session.add(pedido)
    db.session.commit()
    return jsonify(pedido.to_dict()), 201


@bp.patch("/<int:pedido_id>/estado")
@jwt_required()
def cambiar_estado(pedido_id):
    """Cambia el estado de un pedido. Cuerpo: {"estado": "en_preparacion"}"""
    pedido = db.session.get(Pedido, pedido_id)
    if pedido is None:
        return error("Pedido no encontrado", 404)

    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    nuevo = datos.get("estado")
    if nuevo not in ESTADOS:
        return error(f"Estado inválido. Valores permitidos: {', '.join(ESTADOS)}")

    if current_user.rol == "mesero" and pedido.usuario_id != current_user.id:
        return error("Solo puedes modificar tus propios pedidos", 403)

    # 409 = el cambio no es posible desde el estado actual o para este rol.
    permitidos = TRANSICIONES.get(current_user.rol, {}).get(pedido.estado, set())
    if nuevo not in permitidos:
        return error(f"No puedes cambiar un pedido de '{pedido.estado}' a '{nuevo}'", 409)

    pedido.estado = nuevo
    db.session.commit()
    return jsonify(pedido.to_dict())
