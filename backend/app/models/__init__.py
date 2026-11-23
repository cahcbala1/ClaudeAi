"""Importa todos los modelos para que SQLAlchemy los registre al crear las tablas."""
from .categoria import Categoria
from .detalle_pedido import DetallePedido
from .pago import METODOS_PAGO, Pago
from .pedido import ESTADOS, Pedido
from .producto import Producto
from .usuario import ROLES, Usuario
