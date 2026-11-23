"""Modelo Pago: cobro de un pedido (uno por pedido)."""
from datetime import datetime

from ..extensions import db

METODOS_PAGO = ("efectivo", "tarjeta", "transferencia")


class Pago(db.Model):
    __tablename__ = "pagos"

    id = db.Column(db.Integer, primary_key=True)
    # unique=True garantiza un solo pago por pedido.
    pedido_id = db.Column(db.Integer, db.ForeignKey("pedidos.id"), unique=True, nullable=False)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    metodo = db.Column(db.String(20), nullable=False)
    # Mesero o administrador que registró el pago.
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.now)

    # Relaciones
    pedido = db.relationship("Pedido", back_populates="pago")
    usuario = db.relationship("Usuario", back_populates="pagos")

    __table_args__ = (
        db.CheckConstraint("monto > 0", name="ck_pagos_monto"),
        db.CheckConstraint(
            "metodo IN ('efectivo', 'tarjeta', 'transferencia')", name="ck_pagos_metodo"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "pedido_id": self.pedido_id,
            "monto": float(self.monto),
            "metodo": self.metodo,
            "usuario_id": self.usuario_id,
            "registrado_por": self.usuario.nombre if self.usuario else None,
            "fecha": self.fecha.isoformat(),
        }
