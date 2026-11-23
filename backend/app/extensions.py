"""Extensiones de Flask.

Se crean aquí, sin aplicación asociada, para poder importarlas desde
modelos y rutas sin generar importaciones circulares. Se vinculan a la
aplicación en create_app() mediante init_app().
"""
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
