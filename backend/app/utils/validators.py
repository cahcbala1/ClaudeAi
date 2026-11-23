"""Funciones auxiliares para validar los datos que recibe la API."""
from flask import jsonify, request


def leer_json():
    """Devuelve el cuerpo de la petición como diccionario, o None si no es un JSON válido."""
    datos = request.get_json(silent=True)
    return datos if isinstance(datos, dict) else None


def campos_faltantes(datos, campos):
    """Devuelve la lista de campos obligatorios que no vienen o vienen vacíos."""
    faltantes = []
    for campo in campos:
        valor = datos.get(campo)
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            faltantes.append(campo)
    return faltantes


def error(mensaje, codigo=400):
    """Respuesta de error con el formato común de la API: {"error": "mensaje"}."""
    return jsonify({"error": mensaje}), codigo
