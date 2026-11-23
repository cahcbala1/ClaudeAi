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

    registrar_manejadores_error(app)

    # Ruta de prueba: verifica que la API y la base de datos respondan.
    @app.get("/api/health")
    def health():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({"estado": "ok", "app": "SIGO", "base_de_datos": "conectada"})
        except Exception as e:
            app.logger.error("No se pudo conectar a la base de datos: %s", e)
            return jsonify({"estado": "error", "app": "SIGO", "base_de_datos": "sin conexión"}), 503

    # Los Blueprints (auth, usuarios, productos, ...) se registrarán aquí
    # en las siguientes etapas.

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
