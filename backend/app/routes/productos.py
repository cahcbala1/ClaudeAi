"""API de productos.

- Consultar: cualquier usuario autenticado (el mesero usa ?disponible=true).
- Crear, editar y eliminar: solo administrador.
- Disponibilidad: el administrador la cambia con PUT {"disponible": true/false}.
- Solo se puede eliminar un producto que nunca se haya pedido; si ya tiene
  pedidos, se marca como no disponible para conservar el historial.
"""
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from ..extensions import db
from ..models import Categoria, Producto
from ..utils.decorators import rol_requerido
from ..utils.validators import campos_faltantes, error, leer_json, limpiar_descripcion

bp = Blueprint("productos", __name__, url_prefix="/api/productos")

PRECIO_MAXIMO = Decimal("99999999.99")  # Límite de la columna Numeric(10, 2)


def convertir_precio(valor):
    """Convierte el precio (número o texto como "8.50") a Decimal con 2 decimales.

    Devuelve None si no es un precio válido (mayor que 0).
    """
    if isinstance(valor, bool):  # True/False no son precios
        return None
    try:
        precio = Decimal(str(valor).strip())
    except InvalidOperation:
        return None
    if not precio.is_finite() or precio <= 0 or precio > PRECIO_MAXIMO:
        return None
    return precio.quantize(Decimal("0.01"))


def validar_campos(datos):
    """Valida los campos que vengan en "datos". Devuelve un mensaje de error o None."""
    if "nombre" in datos:
        nombre = str(datos["nombre"] or "").strip()
        if not 2 <= len(nombre) <= 100:
            return "El nombre debe tener entre 2 y 100 caracteres"

    if "descripcion" in datos and datos["descripcion"] is not None:
        if len(str(datos["descripcion"]).strip()) > 255:
            return "La descripción no puede superar los 255 caracteres"

    if "precio" in datos and convertir_precio(datos["precio"]) is None:
        return "El precio debe ser un número mayor que 0 (por ejemplo 8.50)"

    if "categoria_id" in datos:
        categoria_id = datos["categoria_id"]
        if not isinstance(categoria_id, int) or isinstance(categoria_id, bool):
            return "categoria_id debe ser un número entero"
        if db.session.get(Categoria, categoria_id) is None:
            return "La categoría indicada no existe"

    if "disponible" in datos and not isinstance(datos["disponible"], bool):
        return "El campo 'disponible' debe ser true o false"

    return None


def nombre_en_uso(nombre, excluir_id=None):
    """Comprueba si ya existe un producto con ese nombre (sin distinguir mayúsculas)."""
    consulta = Producto.query.filter(func.lower(Producto.nombre) == nombre.lower())
    if excluir_id is not None:
        consulta = consulta.filter(Producto.id != excluir_id)
    return consulta.first() is not None


@bp.get("")
@jwt_required()
def listar():
    """Lista productos ordenados por categoría y nombre.

    Filtros opcionales: ?categoria_id=2  ?disponible=true
    """
    consulta = Producto.query.join(Categoria)

    categoria_id = request.args.get("categoria_id")
    if categoria_id:
        if not categoria_id.isdecimal():
            return error("categoria_id debe ser un número entero")
        consulta = consulta.filter(Producto.categoria_id == int(categoria_id))

    disponible = request.args.get("disponible")
    if disponible in ("true", "false"):
        consulta = consulta.filter(Producto.disponible == (disponible == "true"))

    productos = consulta.order_by(Categoria.nombre, Producto.nombre).all()
    return jsonify([p.to_dict() for p in productos])


@bp.get("/<int:producto_id>")
@jwt_required()
def obtener(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return error("Producto no encontrado", 404)
    return jsonify(producto.to_dict())


@bp.post("")
@rol_requerido("admin")
def crear():
    """Crea un producto. Requiere: nombre, precio, categoria_id.
    Opcionales: descripcion, disponible (por defecto true)."""
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    faltantes = campos_faltantes(datos, ["nombre", "precio", "categoria_id"])
    if faltantes:
        return error(f"Campos obligatorios: {', '.join(faltantes)}")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    nombre = str(datos["nombre"]).strip()
    if nombre_en_uso(nombre):
        return error("Ya existe un producto con ese nombre", 409)

    producto = Producto(
        nombre=nombre,
        descripcion=limpiar_descripcion(datos.get("descripcion")),
        precio=convertir_precio(datos["precio"]),
        categoria_id=datos["categoria_id"],
        disponible=datos.get("disponible", True),
    )
    db.session.add(producto)
    db.session.commit()
    return jsonify(producto.to_dict()), 201


@bp.put("/<int:producto_id>")
@rol_requerido("admin")
def actualizar(producto_id):
    """Actualiza los campos enviados: nombre, descripcion, precio, categoria_id, disponible."""
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return error("Producto no encontrado", 404)

    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    permitidos = {"nombre", "descripcion", "precio", "categoria_id", "disponible"}
    if not permitidos & datos.keys():
        return error(f"No hay campos para actualizar. Permitidos: {', '.join(sorted(permitidos))}")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    if "nombre" in datos:
        nombre = str(datos["nombre"]).strip()
        if nombre_en_uso(nombre, excluir_id=producto.id):
            return error("Ya existe un producto con ese nombre", 409)
        producto.nombre = nombre

    if "descripcion" in datos:
        producto.descripcion = limpiar_descripcion(datos["descripcion"])
    # Cambiar el precio no afecta a pedidos anteriores: cada detalle guarda su propio precio.
    if "precio" in datos:
        producto.precio = convertir_precio(datos["precio"])
    if "categoria_id" in datos:
        producto.categoria_id = datos["categoria_id"]
    if "disponible" in datos:
        producto.disponible = datos["disponible"]

    db.session.commit()
    return jsonify(producto.to_dict())


@bp.delete("/<int:producto_id>")
@rol_requerido("admin")
def eliminar(producto_id):
    """Elimina un producto solo si nunca se ha incluido en un pedido."""
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return error("Producto no encontrado", 404)

    if producto.detalles:
        return error(
            "No se puede eliminar: el producto ya forma parte de pedidos. "
            "Márcalo como no disponible",
            409,
        )

    db.session.delete(producto)
    db.session.commit()
    return jsonify({"mensaje": "Producto eliminado"})
