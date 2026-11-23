"""Modelo Pedido: orden registrada por un mesero para una mesa."""
from datetime import datetime

from ..extensions import db

# Estados posibles del pedido (las reglas de cambio se aplican en la API de pedidos).
ESTADOS = ("pendiente", "en_preparacion", "listo", "entregado", "cancelado")


class Pedido(db.Model):
    __tablename__ = "pedidos"

    id = db.Column(db.Integer, primary_key=True)
    mesa = db.Column(db.Integer, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="pendiente")
    observaciones = db.Column(db.String(255))
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    # Mesero que registró el pedido.
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    creado_en = db.Column(db.DateTime, nullable=False, default=datetime.now)
    actualizado_en = db.Column(
        db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now
    )

    # Relaciones
    usuario = db.relationship("Usuario", back_populates="pedidos")
    # Si se elimina un pedido, se eliminan también sus detalles.
    detalles = db.relationship(
        "DetallePedido", back_populates="pedido", cascade="all, delete-orphan"
    )
    # Un pedido tiene como máximo un pago.
    pago = db.relationship("Pago", back_populates="pedido", uselist=False)

    __table_args__ = (
        db.CheckConstraint("mesa > 0", name="ck_pedidos_mesa"),
        db.CheckConstraint(
            "estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')",
            name="ck_pedidos_estado",
        ),
    )

    def to_dict(self, incluir_detalles=True):
        datos = {
            "id": self.id,
            "mesa": self.mesa,
            "estado": self.estado,
            "observaciones": self.observaciones,
            "total": float(self.total),
            "usuario_id": self.usuario_id,
            "mesero": self.usuario.nombre if self.usuario else None,
            "pagado": self.pago is not None,
            "creado_en": self.creado_en.isoformat(),
            "actualizado_en": self.actualizado_en.isoformat(),
        }
        if incluir_detalles:
            datos["detalles"] = [d.to_dict() for d in self.detalles]
        return datos
