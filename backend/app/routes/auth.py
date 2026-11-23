"""Rutas de autenticación: inicio de sesión y datos del usuario actual."""
from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, current_user, jwt_required

from ..models import Usuario
from ..utils.validators import campos_faltantes, error, leer_json

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    """Recibe {"username", "password"} y devuelve un token JWT y los datos del usuario."""
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    faltantes = campos_faltantes(datos, ["username", "password"])
    if faltantes:
        return error(f"Campos obligatorios: {', '.join(faltantes)}")

    username = str(datos["username"]).strip()
    usuario = Usuario.query.filter_by(username=username).first()

    # Mismo mensaje si el usuario no existe o la contraseña es incorrecta,
    # para no revelar qué nombres de usuario existen.
    if usuario is None or not usuario.check_password(str(datos["password"])):
        return error("Usuario o contraseña incorrectos", 401)

    if not usuario.activo:
        return error("El usuario está desactivado. Contacta al administrador", 403)

    # El "identity" del token es el id del usuario (como texto, lo exige JWT).
    token = create_access_token(identity=str(usuario.id), additional_claims={"rol": usuario.rol})
    return jsonify({"access_token": token, "usuario": usuario.to_dict()})


@bp.get("/me")
@jwt_required()
def perfil():
    """Devuelve los datos del usuario dueño del token."""
    return jsonify(current_user.to_dict())
