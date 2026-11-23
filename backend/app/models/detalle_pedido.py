"""Modelo DetallePedido: cada producto incluido en un pedido."""
from ..extensions import db


class DetallePedido(db.Model):
    __tablename__ = "detalles_pedido"

    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(
        db.Integer, db.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    # Precio copiado del producto al momento del pedido: si el precio cambia
    # después, los pedidos anteriores conservan su valor original.
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    # Relaciones
    pedido = db.relationship("Pedido", back_populates="detalles")
    producto = db.relationship("Producto", back_populates="detalles")

    __table_args__ = (
        db.CheckConstraint("cantidad > 0", name="ck_detalles_cantidad"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "producto_id": self.producto_id,
            "producto": self.producto.nombre if self.producto else None,
            "cantidad": self.cantidad,
            "precio_unitario": float(self.precio_unitario),
            "subtotal": float(self.subtotal),
        }
