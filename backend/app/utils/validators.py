"""Funciones auxiliares para validar los datos que recibe la API."""
from datetime import datetime, timedelta

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


def limpiar_descripcion(valor):
    """Convierte una descripción vacía en None (NULL en la base de datos)."""
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def es_entero(valor):
    """True si el valor es un entero de JSON (True/False no cuentan como enteros)."""
    return isinstance(valor, int) and not isinstance(valor, bool)


def rango_de_fecha(texto):
    """Convierte "AAAA-MM-DD" en (inicio, fin) de ese día para filtrar por fecha.

    Devuelve None si el texto no tiene el formato correcto.
    """
    try:
        inicio = datetime.strptime(texto, "%Y-%m-%d")
    except ValueError:
        return None
    return inicio, inicio + timedelta(days=1)


def error(mensaje, codigo=400):
    """Respuesta de error con el formato común de la API: {"error": "mensaje"}."""
    return jsonify({"error": mensaje}), codigo
