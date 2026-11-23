"""Configuración de la aplicación leída desde variables de entorno (.env)."""
import os
from datetime import timedelta

from dotenv import load_dotenv

# Carga las variables del archivo .env (si existe) al entorno del proceso.
load_dotenv()


def _requerida(nombre):
    """Devuelve una variable de entorno obligatoria o detiene el arranque con un mensaje claro."""
    valor = os.getenv(nombre)
    if not valor:
        raise RuntimeError(
            f"Falta la variable de entorno obligatoria '{nombre}'. "
            "Revisa tu archivo backend/.env (usa .env.example como guía)."
        )
    return valor


class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    SECRET_KEY = _requerida("SECRET_KEY")

    # Base de datos
    SQLALCHEMY_DATABASE_URI = _requerida("DATABASE_URL")

    # JWT
    JWT_SECRET_KEY = _requerida("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "8")))
