"""Modelo Producto: elementos del menú que se pueden pedir."""
from datetime import datetime

from ..extensions import db


class Producto(db.Model):
    __tablename__ = "productos"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.String(255))
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    # Control básico de disponibilidad: el administrador lo activa o desactiva.
    disponible = db.Column(db.Boolean, nullable=False, default=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey("categorias.id"), nullable=False)
    creado_en = db.Column(db.DateTime, nullable=False, default=datetime.now)

    # Relaciones
    categoria = db.relationship("Categoria", back_populates="productos")
    detalles = db.relationship("DetallePedido", back_populates="producto")

    __table_args__ = (
        db.CheckConstraint("precio >= 0", name="ck_productos_precio"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "precio": float(self.precio),
            "disponible": self.disponible,
            "categoria_id": self.categoria_id,
            "categoria": self.categoria.nombre if self.categoria else None,
        }
