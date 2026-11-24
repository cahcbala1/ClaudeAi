"""Fábrica de la aplicación Flask de SIGO."""
from flask import Flask, jsonify
from sqlalchemy import text
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import db, jwt

# Mensajes en español para los errores HTTP más comunes.
MENSAJES_ERROR = {
    400: "Solicitud incorrecta",
    401: "No autorizado",
    403: "Acceso denegado",
    404: "Recurso no encontrado",
    405: "Método no permitido",
    415: "El contenido debe enviarse en formato JSON",
}


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Respuestas JSON con acentos legibles y en el orden definido.
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    # Extensiones
    db.init_app(app)
    jwt.init_app(app)

    # Registra los modelos en SQLAlchemy (necesario para crear las tablas).
    from . import models  # noqa: F401

    registrar_manejadores_error(app)
    registrar_callbacks_jwt()

    # Ruta de prueba: verifica que la API y la base de datos respondan.
    @app.get("/api/health")
    def health():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({"estado": "ok", "app": "SIGO", "base_de_datos": "conectada"})
        except Exception as e:
            app.logger.error("No se pudo conectar a la base de datos: %s", e)
            return jsonify({"estado": "error", "app": "SIGO", "base_de_datos": "sin conexión"}), 503

    # Blueprints (módulos de la API). Los demás se agregarán en las siguientes etapas.
    from .routes import auth, categorias, productos, usuarios
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuarios.bp)
    app.register_blueprint(categorias.bp)
    app.register_blueprint(productos.bp)

    return app


def registrar_manejadores_error(app):
    """Hace que todos los errores se devuelvan como JSON: {"error": "mensaje"}."""

    @app.errorhandler(HTTPException)
    def error_http(e):
        mensaje = MENSAJES_ERROR.get(e.code, e.description)
        return jsonify({"error": mensaje}), e.code

    @app.errorhandler(Exception)
    def error_inesperado(e):
        # Se registra el detalle en consola, pero no se expone al cliente.
        app.logger.exception(e)
        return jsonify({"error": "Error interno del servidor"}), 500


def registrar_callbacks_jwt():
    """Define cómo se obtiene el usuario del token y los mensajes de error de JWT."""
    from .models import Usuario

    @jwt.user_lookup_loader
    def cargar_usuario(_cabecera, datos_token):
        # Se ejecuta en cada ruta protegida: carga el usuario dueño del token
        # (disponible luego como "current_user"). Si fue desactivado, se rechaza.
        usuario = db.session.get(Usuario, int(datos_token["sub"]))
        return usuario if usuario and usuario.activo else None

    @jwt.user_lookup_error_loader
    def usuario_no_valido(_cabecera, _datos_token):
        return jsonify({"error": "El usuario no existe o está desactivado"}), 401

    @jwt.unauthorized_loader
    def sin_token(_motivo):
        return jsonify({"error": "Debes iniciar sesión (falta el token)"}), 401

    @jwt.invalid_token_loader
    def token_invalido(_motivo):
        return jsonify({"error": "Token inválido"}), 401

    @jwt.expired_token_loader
    def token_expirado(_cabecera, _datos_token):
        return jsonify({"error": "La sesión expiró, inicia sesión nuevamente"}), 401
