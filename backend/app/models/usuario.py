"""Modelo Usuario: personas que usan el sistema (administrador, mesero, cocina)."""
from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db

ROLES = ("admin", "mesero", "cocina")


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False)
    # En lugar de borrar usuarios se desactivan, para conservar sus pedidos.
    activo = db.Column(db.Boolean, nullable=False, default=True)
    creado_en = db.Column(db.DateTime, nullable=False, default=datetime.now)

    # Relaciones
    pedidos = db.relationship("Pedido", back_populates="usuario")
    pagos = db.relationship("Pago", back_populates="usuario")

    __table_args__ = (
        db.CheckConstraint("rol IN ('admin', 'mesero', 'cocina')", name="ck_usuarios_rol"),
    )

    def set_password(self, password):
        """Guarda la contraseña cifrada (nunca en texto plano)."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        # No se incluye password_hash.
        return {
            "id": self.id,
            "nombre": self.nombre,
            "username": self.username,
            "rol": self.rol,
            "activo": self.activo,
            "creado_en": self.creado_en.isoformat(),
        }
