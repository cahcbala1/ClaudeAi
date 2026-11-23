"""Crea las tablas de la base de datos y los datos iniciales de SIGO.

Uso (desde la carpeta backend, con el entorno virtual activado):
    python seed.py           Crea las tablas que falten y los datos iniciales.
    python seed.py --reset   BORRA todas las tablas y datos, y los vuelve a crear.
"""
import os
import sys

from app import create_app
from app.extensions import db
from app.models import Categoria, Producto, Usuario

# Datos de ejemplo para poder probar el sistema desde el inicio.
CATEGORIAS_EJEMPLO = {
    "Bebidas": [("Limonada", 2.50), ("Café americano", 1.80), ("Gaseosa", 1.50)],
    "Platos fuertes": [("Pollo a la plancha", 8.50), ("Lomo saltado", 9.90), ("Arroz chaufa", 7.50)],
    "Postres": [("Flan", 3.00), ("Helado", 2.80)],
}


def crear_admin():
    if Usuario.query.filter_by(rol="admin").first():
        print("- Ya existe un administrador; no se crea otro.")
        return

    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD")
    if not password or len(password) < 6:
        sys.exit("ERROR: define ADMIN_PASSWORD (mínimo 6 caracteres) en backend/.env")

    admin = Usuario(nombre="Administrador", username=username, rol="admin")
    admin.set_password(password)
    db.session.add(admin)
    print(f"- Administrador creado: usuario '{username}'.")


def crear_datos_ejemplo():
    if Categoria.query.first():
        print("- Ya existen categorías; no se cargan datos de ejemplo.")
        return

    for nombre_categoria, productos in CATEGORIAS_EJEMPLO.items():
        categoria = Categoria(nombre=nombre_categoria)
        db.session.add(categoria)
        for nombre, precio in productos:
            db.session.add(Producto(nombre=nombre, precio=precio, categoria=categoria))
    print("- Categorías y productos de ejemplo creados.")


def main():
    app = create_app()
    with app.app_context():
        if "--reset" in sys.argv:
            db.drop_all()
            print("- Tablas eliminadas.")

        db.create_all()
        print("- Tablas creadas (o ya existían).")

        crear_admin()
        crear_datos_ejemplo()
        db.session.commit()
        print("Listo.")


if __name__ == "__main__":
    main()
