"""Decoradores para proteger las rutas de la API según el rol del usuario."""
from functools import wraps

from flask_jwt_extended import current_user, verify_jwt_in_request

from .validators import error


def rol_requerido(*roles):
    """Permite el acceso solo a usuarios autenticados con alguno de los roles indicados.

    Uso:
        @bp.get("/usuarios")
        @rol_requerido("admin")
        def listar_usuarios(): ...
    """
    def decorador(funcion):
        @wraps(funcion)
        def envoltura(*args, **kwargs):
            # Verifica que venga un token válido (si no, responde 401).
            verify_jwt_in_request()
            # El rol se toma de la base de datos (current_user), no del token,
            # para que un cambio de rol se aplique de inmediato.
            if current_user.rol not in roles:
                return error("No tienes permiso para realizar esta acción", 403)
            return funcion(*args, **kwargs)
        return envoltura
    return decorador
