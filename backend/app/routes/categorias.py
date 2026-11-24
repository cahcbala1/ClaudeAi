"""API de categorías.

- Consultar: cualquier usuario autenticado (el mesero las usa al tomar pedidos).
- Crear, editar y eliminar: solo administrador.
- Solo se puede eliminar una categoría que no tenga productos.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from ..extensions import db
from ..models import Categoria
from ..utils.decorators import rol_requerido
from ..utils.validators import campos_faltantes, error, leer_json, limpiar_descripcion

bp = Blueprint("categorias", __name__, url_prefix="/api/categorias")


def validar_campos(datos):
    """Valida los campos que vengan en "datos". Devuelve un mensaje de error o None."""
    if "nombre" in datos:
        nombre = str(datos["nombre"] or "").strip()
        if not 2 <= len(nombre) <= 80:
            return "El nombre debe tener entre 2 y 80 caracteres"

    if "descripcion" in datos and datos["descripcion"] is not None:
        if len(str(datos["descripcion"]).strip()) > 255:
            return "La descripción no puede superar los 255 caracteres"

    return None


def nombre_en_uso(nombre, excluir_id=None):
    """Comprueba si ya existe una categoría con ese nombre (sin distinguir mayúsculas)."""
    consulta = Categoria.query.filter(func.lower(Categoria.nombre) == nombre.lower())
    if excluir_id is not None:
        consulta = consulta.filter(Categoria.id != excluir_id)
    return consulta.first() is not None


def categoria_a_dict(categoria):
    """Datos de la categoría más la cantidad de productos que contiene."""
    datos = categoria.to_dict()
    datos["total_productos"] = len(categoria.productos)
    return datos


@bp.get("")
@jwt_required()
def listar():
    categorias = Categoria.query.order_by(Categoria.nombre).all()
    return jsonify([categoria_a_dict(c) for c in categorias])


@bp.get("/<int:categoria_id>")
@jwt_required()
def obtener(categoria_id):
    categoria = db.session.get(Categoria, categoria_id)
    if categoria is None:
        return error("Categoría no encontrada", 404)
    return jsonify(categoria_a_dict(categoria))


@bp.post("")
@rol_requerido("admin")
def crear():
    """Crea una categoría. Requiere: nombre. Opcional: descripcion."""
    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    if campos_faltantes(datos, ["nombre"]):
        return error("Campos obligatorios: nombre")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    nombre = str(datos["nombre"]).strip()
    if nombre_en_uso(nombre):
        return error("Ya existe una categoría con ese nombre", 409)

    categoria = Categoria(nombre=nombre, descripcion=limpiar_descripcion(datos.get("descripcion")))
    db.session.add(categoria)
    db.session.commit()
    return jsonify(categoria_a_dict(categoria)), 201


@bp.put("/<int:categoria_id>")
@rol_requerido("admin")
def actualizar(categoria_id):
    """Actualiza los campos enviados: nombre, descripcion."""
    categoria = db.session.get(Categoria, categoria_id)
    if categoria is None:
        return error("Categoría no encontrada", 404)

    datos = leer_json()
    if datos is None:
        return error("El cuerpo de la petición debe ser un JSON válido")

    if not {"nombre", "descripcion"} & datos.keys():
        return error("No hay campos para actualizar. Permitidos: nombre, descripcion")

    mensaje = validar_campos(datos)
    if mensaje:
        return error(mensaje)

    if "nombre" in datos:
        nombre = str(datos["nombre"]).strip()
        if nombre_en_uso(nombre, excluir_id=categoria.id):
            return error("Ya existe una categoría con ese nombre", 409)
        categoria.nombre = nombre

    if "descripcion" in datos:
        categoria.descripcion = limpiar_descripcion(datos["descripcion"])

    db.session.commit()
    return jsonify(categoria_a_dict(categoria))


@bp.delete("/<int:categoria_id>")
@rol_requerido("admin")
def eliminar(categoria_id):
    """Elimina una categoría solo si no tiene productos asociados."""
    categoria = db.session.get(Categoria, categoria_id)
    if categoria is None:
        return error("Categoría no encontrada", 404)

    if categoria.productos:
        return error(
            "No se puede eliminar: la categoría tiene productos. "
            "Primero muévelos a otra categoría",
            409,
        )

    db.session.delete(categoria)
    db.session.commit()
    return jsonify({"mensaje": "Categoría eliminada"})
