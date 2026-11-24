"""API de pagos.

Reglas:
- Solo se puede pagar un pedido "entregado" (el cliente ya recibió su comida).
- Un pedido tiene un único pago, por el total del pedido.
- Lo registra el mesero que atendió el pedido o el administrador.
- Los pagos no se editan ni se eliminan, para mantener un registro de ventas confiable.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import METODOS_PAGO, Pago, Pedido
from ..utils.decorators import rol_requerido
from ..utils.validators import es_entero, error, leer_json, rango_de_fecha

bp = Blueprint("pagos", __name__, url_prefix="/api/pagos")


@bp.get("")
@rol_requerido("admin", "mesero")
def listar():
    """Lista pagos, del más reciente al más antiguo.

    - Administrador: todos. Mesero: solo los de sus pedidos.
    - Filtros opcionales: ?fecha=2026-11-24  ?metodo=efectivo
    """
    consulta = Pago.query.join(Pedido)

    if current_user.rol == "mesero":
        consulta = consulta.filter(Pedido.usuario_id == current_user.id)

    metodo = request.args.get("metodo")
    if metodo:
        if metodo not in METODOS_PAGO:
            return error(f"Método inválido. Valores permitidos: {', '.join(METODOS_PAGO)}")
        consulta = consulta.filter(Pago.metodo == metodo)

    fecha = request.args.get("fecha")
    if fecha:
        rango = rango_de_fecha(fecha)
        if rango is None:
            return error("La fecha debe tener el formato AAAA-MM-DD")
        consulta = consulta.filter(Pago.fecha >= rango[0], Pago.fecha < rango[1])

    pagos = consulta.order_by(Pago.fecha.desc()).all()
    return jsonify([p.to_dict() for p in pagos])


@bp.get("/<int:pago_id>")
@rol_requerido("admin", "mesero")
def obtener(pago_id):
    pago = db.session.get(Pago, pago_id)
    if pago is None:
        return error("Pago no encontrado", 404)
    if current_user.rol == "mesero" and pago.pedido.usuario_id != current_user.id:
        return error("Solo puedes ver los pagos de tus propios pedidos", 403)
    return jsonify(pago.to_dict())


@bp.post("")
@rol_requerido("admin", "mesero")
def registrar():
    """Registra el pago de un pedido entregado.

    Cuerpo: {"pedido_id": 5, "metodo": "efectivo"}
    El monto es siempre el total del pedido (no lo envía el cliente).
    """
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    pedido_id = datos.get("pedido_id")
    if not es_entero(pedido_id):
        return error("pedido_id debe ser un número entero")

    metodo = datos.get("metodo")
    if metodo not in METODOS_PAGO:
        return error(f"Método de pago inválido. Valores permitidos: {', '.join(METODOS_PAGO)}")

    pedido = db.session.get(Pedido, pedido_id)
    if pedido is None:
        return error("Pedido no encontrado", 404)

    if current_user.rol == "mesero" and pedido.usuario_id != current_user.id:
        return error("Solo puedes cobrar tus propios pedidos", 403)

    if pedido.pago is not None:
        return error("Este pedido ya fue pagado", 409)

    if pedido.estado != "entregado":
        return error(
            f"Solo se pueden pagar pedidos entregados (estado actual: '{pedido.estado}')", 409
        )

    pago = Pago(pedido_id=pedido.id, monto=pedido.total, metodo=metodo, usuario_id=current_user.id)
    db.session.add(pago)
    try:
        db.session.commit()
    except IntegrityError:
        # Dos pagos simultáneos del mismo pedido: la restricción UNIQUE lo impide.
        db.session.rollback()
        return error("Este pedido ya fue pagado", 409)

    return jsonify(pago.to_dict()), 201
