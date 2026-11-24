"""API de usuarios (solo administrador).

Los usuarios no se eliminan: se desactivan con "activo": false para
conservar el historial de pedidos y pagos que registraron.
"""
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user
from sqlalchemy import func

from ..extensions import db
from ..models import ROLES, Usuario
from ..utils.decorators import rol_requerido
from ..utils.validators import campos_faltantes, error, leer_json

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")

# Letras, números, punto y guion bajo; entre 3 y 50 caracteres.
PATRON_USERNAME = re.compile(r"^[A-Za-z0-9_.]{3,50}$")


def validar_campos(datos):
    """Valida los campos que vengan en "datos". Devuelve un mensaje de error o None."""
    # Deben ser texto: str(None) daría "None" y pasaría las validaciones.
    for campo in ("nombre", "username", "password"):
        if campo in datos and not isinstance(datos[campo], str):
            return f"El campo '{campo}' debe ser texto"

    if "nombre" in datos:
        nombre = datos["nombre"].strip()
        if not 2 <= len(nombre) <= 100:
            return "El nombre debe tener entre 2 y 100 caracteres"

    if "username" in datos:
        if not PATRON_USERNAME.match(datos["username"].strip()):
            return "El usuario debe tener de 3 a 50 caracteres (letras, números, punto o guion bajo)"

    if "password" in datos:
        if len(str(datos["password"])) < 6:
            return "La contraseña debe tener al menos 6 caracteres"

    if "rol" in datos and datos["rol"] not in ROLES:
        return f"Rol inválido. Valores permitidos: {', '.join(ROLES)}"

    if "activo" in datos and not isinstance(datos["activo"], bool):
        return "El campo 'activo' debe ser true o false"

    return None


def username_en_uso(username, excluir_id=None):
    """Comprueba si el username ya existe (sin distinguir mayúsculas)."""
    consulta = Usuario.query.filter(func.lower(Usuario.username) == username.lower())
    if excluir_id is not None:
        consulta = consulta.filter(Usuario.id != excluir_id)
    return consulta.first() is not None


@bp.get("")
@rol_requerido("admin")
def listar():
    """Lista usuarios. Filtros opcionales: ?rol=mesero  ?activo=true"""
    consulta = Usuario.query

    rol = request.args.get("rol")
    if rol:
        if rol not in ROLES:
            return error(f"Rol inválido. Valores permitidos: {', '.join(ROLES)}")
        consulta = consulta.filter_by(rol=rol)

    activo = request.args.get("activo")
    if activo in ("true", "false"):
        consulta = consulta.filter_by(activo=(activo == "true"))

    usuarios = consulta.order_by(Usuario.nombre).all()
    return jsonify([u.to_dict() for u in usuarios])


@bp.get("/<int:usuario_id>")
@rol_requerido("admin")
def obtener(usuario_id):
    usuario = db.session.get(Usuario, usuario_id)
    if usuario is None:
        return error("Usuario no encontrado", 404)
    return jsonify(usuario.to_dict())


@bp.post("")
@rol_requerido("admin")
def crear():
    """Crea un usuario. Requiere: nombre, username, password, rol."""
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    faltantes = campos_faltantes(datos, ["nombre", "username", "password", "rol"])
    if faltantes:
        return error(f"Campos obligatorios: {', '.join(faltantes)}")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    username = str(datos["username"]).strip()
    if username_en_uso(username):
        return error("El nombre de usuario ya está en uso", 409)

    usuario = Usuario(
        nombre=str(datos["nombre"]).strip(),
        username=username,
        rol=datos["rol"],
    )
    usuario.set_password(str(datos["password"]))
    db.session.add(usuario)
    db.session.commit()
    return jsonify(usuario.to_dict()), 201


@bp.put("/<int:usuario_id>")
@rol_requerido("admin")
def actualizar(usuario_id):
    """Actualiza los campos enviados: nombre, username, password, rol, activo."""
    usuario = db.session.get(Usuario, usuario_id)
    if usuario is None:
        return error("Usuario no encontrado", 404)

    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    permitidos = {"nombre", "username", "password", "rol", "activo"}
    if not permitidos & datos.keys():
        return error(f"No hay campos para actualizar. Permitidos: {', '.join(sorted(permitidos))}")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    # Evita que el administrador se bloquee a sí mismo.
    if usuario.id == current_user.id:
        if datos.get("activo") is False:
            return error("No puedes desactivar tu propio usuario")
        if "rol" in datos and datos["rol"] != "admin":
            return error("No puedes quitarte el rol de administrador")

    if "username" in datos:
        username = str(datos["username"]).strip()
        if username_en_uso(username, excluir_id=usuario.id):
            return error("El nombre de usuario ya está en uso", 409)
        usuario.username = username

    if "nombre" in datos:
        usuario.nombre = str(datos["nombre"]).strip()
    if "password" in datos:
        usuario.set_password(str(datos["password"]))
    if "rol" in datos:
        usuario.rol = datos["rol"]
    if "activo" in datos:
        usuario.activo = datos["activo"]

    db.session.commit()
    return jsonify(usuario.to_dict())
