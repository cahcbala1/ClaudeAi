"""API de reportes de ventas (solo administrador).

Los reportes no se guardan: se calculan en cada consulta a partir de los
pagos registrados, por eso se puede consultar cualquier día o mes pasado.
Una venta = un pago registrado (el pedido ya fue entregado y cobrado).
"""
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import Date, cast, func

from ..extensions import db
from ..models import DetallePedido, Pago, Pedido, Producto
from ..utils.decorators import rol_requerido
from ..utils.validators import error, rango_de_fecha

bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")

TOP_PRODUCTOS = 10  # Cantidad de productos en el ranking de más vendidos


def a_numero(valor):
    """Convierte el resultado de SUM (Decimal o None) a número con 2 decimales."""
    return round(float(valor or 0), 2)


def resumen_ventas(inicio, fin):
    """Calcula los indicadores de ventas entre inicio (incluido) y fin (excluido)."""
    en_rango = (Pago.fecha >= inicio, Pago.fecha < fin)

    total, pagados = db.session.query(func.sum(Pago.monto), func.count(Pago.id)).filter(*en_rango).one()

    por_metodo = (
        db.session.query(Pago.metodo, func.count(Pago.id), func.sum(Pago.monto))
        .filter(*en_rango)
        .group_by(Pago.metodo)
        .order_by(func.sum(Pago.monto).desc())
        .all()
    )

    # Productos de los pedidos pagados en el rango, del más vendido al menos vendido.
    productos = (
        db.session.query(Producto.nombre, func.sum(DetallePedido.cantidad), func.sum(DetallePedido.subtotal))
        .join(DetallePedido, DetallePedido.producto_id == Producto.id)
        .join(Pago, Pago.pedido_id == DetallePedido.pedido_id)
        .filter(*en_rango)
        .group_by(Producto.id, Producto.nombre)
        .order_by(func.sum(DetallePedido.cantidad).desc(), Producto.nombre)
        .limit(TOP_PRODUCTOS)
        .all()
    )

    cancelados = Pedido.query.filter(
        Pedido.estado == "cancelado", Pedido.creado_en >= inicio, Pedido.creado_en < fin
    ).count()

    return {
        "total_ventas": a_numero(total),
        "pedidos_pagados": pagados,
        "ticket_promedio": a_numero(total / pagados) if pagados else 0.0,
        "pedidos_cancelados": cancelados,
        "por_metodo": [
            {"metodo": metodo, "pagos": cantidad, "total": a_numero(suma)}
            for metodo, cantidad, suma in por_metodo
        ],
        "productos_mas_vendidos": [
            {"producto": nombre, "cantidad": int(cantidad), "total": a_numero(suma)}
            for nombre, cantidad, suma in productos
        ],
    }


@bp.get("/dia")
@rol_requerido("admin")
def reporte_dia():
    """Ventas de un día. Parámetro opcional: ?fecha=AAAA-MM-DD (por defecto, hoy)."""
    fecha = request.args.get("fecha") or date.today().isoformat()
    rango = rango_de_fecha(fecha)
    if rango is None:
        return error("La fecha debe tener el formato AAAA-MM-DD")

    return jsonify({"fecha": fecha, **resumen_ventas(*rango)})


@bp.get("/mes")
@rol_requerido("admin")
def reporte_mes():
    """Ventas de un mes. Parámetros opcionales: ?anio=2026&mes=11 (por defecto, el mes actual)."""
    hoy = date.today()
    anio = request.args.get("anio", str(hoy.year))
    mes = request.args.get("mes", str(hoy.month))

    if not anio.isdigit() or not 2000 <= int(anio) <= 2100:
        return error("El año debe ser un número entre 2000 y 2100")
    if not mes.isdigit() or not 1 <= int(mes) <= 12:
        return error("El mes debe ser un número entre 1 y 12")
    anio, mes = int(anio), int(mes)

    inicio = datetime(anio, mes, 1)
    fin = datetime(anio + 1, 1, 1) if mes == 12 else datetime(anio, mes + 1, 1)

    # Total por cada día del mes que tuvo ventas.
    dia = cast(Pago.fecha, Date)
    por_dia = (
        db.session.query(dia, func.count(Pago.id), func.sum(Pago.monto))
        .filter(Pago.fecha >= inicio, Pago.fecha < fin)
        .group_by(dia)
        .order_by(dia)
        .all()
    )

    return jsonify({
        "anio": anio,
        "mes": mes,
        **resumen_ventas(inicio, fin),
        "por_dia": [
            {"fecha": d.isoformat(), "pedidos_pagados": cantidad, "total": a_numero(suma)}
            for d, cantidad, suma in por_dia
        ],
    })
