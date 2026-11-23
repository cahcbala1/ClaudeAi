"""Modelo Categoria: agrupa los productos del menú (bebidas, platos fuertes, ...)."""
from ..extensions import db


class Categoria(db.Model):
    __tablename__ = "categorias"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    descripcion = db.Column(db.String(255))

    # Relaciones
    productos = db.relationship("Producto", back_populates="categoria")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
        }
