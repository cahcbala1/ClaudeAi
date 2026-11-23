# SIGO — Sistema de Gestión de Pedidos

Aplicación web académica para administrar productos, pedidos, usuarios y ventas
de un restaurante pequeño.

## Tecnologías

| Capa          | Tecnología                                               |
|---------------|----------------------------------------------------------|
| Backend       | Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended      |
| Base de datos | PostgreSQL                                               |
| Frontend      | React + Vite, JavaScript, CSS                            |
| Comunicación  | API REST (JSON) con autenticación JWT                    |

## Estructura del proyecto

```
SIGO/
├── backend/     API REST en Flask
├── frontend/    Aplicación React (Vite)
├── docs/        Documentación técnica (RUP/UML)
├── .gitignore
└── README.md
```

## Roles

- **Administrador**: usuarios, categorías, productos, pedidos y reportes.
- **Mesero**: consulta productos, registra pedidos y ve su estado.
- **Cocina**: consulta pedidos pendientes y cambia su estado.

> Las instrucciones de instalación y ejecución se agregarán en cada etapa.
