# SIGO — Sistema de Gestión de Pedidos

Aplicación web académica para administrar productos, pedidos, usuarios y ventas
de un restaurante pequeño. El mesero toma el pedido, la cocina lo prepara, el
mesero lo entrega y lo cobra, y el administrador consulta las ventas.

## Tecnologías

| Capa          | Tecnología                                               |
|---------------|----------------------------------------------------------|
| Backend       | Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended      |
| Base de datos | PostgreSQL                                               |
| Frontend      | React + Vite, React Router, JavaScript, CSS              |
| Comunicación  | API REST (JSON) con autenticación JWT                    |

## Roles

| Rol               | Qué puede hacer                                                                                   |
|-------------------|---------------------------------------------------------------------------------------------------|
| **Administrador** | Panel con el resumen del día; usuarios, categorías y productos; ver, cancelar y cobrar pedidos; pagos y reportes de ventas. |
| **Mesero**        | Registrar pedidos, ver los suyos, cancelarlos mientras están pendientes, entregarlos y cobrarlos. |
| **Cocina**        | Tablero con los pedidos pendientes, en preparación y listos; cambiar su estado.                   |

## Flujo de un pedido

```
pendiente ──(cocina)──► en_preparacion ──(cocina)──► listo ──(mesero)──► entregado ──(mesero o admin)──► pagado
    │
    └──(mesero dueño o administrador)──► cancelado
```

- Los precios se copian al pedido al crearlo: si luego cambia el precio de un
  producto, los pedidos anteriores conservan su total.
- Un pedido tiene un único pago, por su total, y solo se cobra cuando ya fue entregado.
- Los pagos no se editan ni se eliminan. Los reportes se calculan a partir de ellos.

## Estructura del proyecto

```
├── backend/
│   ├── app/
│   │   ├── models/       Tablas: usuario, categoría, producto, pedido, detalle, pago
│   │   ├── routes/       Endpoints de la API (uno por recurso)
│   │   ├── utils/        Validaciones y control de acceso por rol
│   │   ├── config.py     Configuración leída de .env
│   │   └── __init__.py   Crea la aplicación Flask
│   ├── sql/crear_bd.sql  Crea el usuario y la base de datos en PostgreSQL
│   ├── seed.py           Crea las tablas, el administrador y datos de ejemplo
│   ├── run.py            Arranca el servidor
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/          Cliente HTTP (agrega el token JWT)
│   │   ├── components/   Layout, rutas protegidas, tarjetas y modales
│   │   ├── context/      Sesión del usuario
│   │   ├── pages/        Pantallas: login, admin/, mesero/, cocina/
│   │   └── utils/        Formato de precios y fechas
│   ├── vite.config.js    Redirige /api al backend en desarrollo
│   └── package.json
└── README.md
```

## Requisitos

- Python 3.10 o superior
- Node.js 20 o superior (con npm)
- PostgreSQL 14 o superior

## Instalación

### 1. Base de datos

Edita la contraseña en `backend/sql/crear_bd.sql` y ejecútalo una sola vez como
superusuario `postgres`:

```bash
psql -U postgres -f backend/sql/crear_bd.sql
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS
pip install -r requirements.txt
```

Copia `.env.example` como `.env` y completa los valores:

| Variable             | Descripción                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `FLASK_DEBUG`        | `1` en desarrollo, `0` en producción                                        |
| `SECRET_KEY`         | Clave aleatoria de Flask                                                    |
| `JWT_SECRET_KEY`     | Clave aleatoria para firmar los tokens                                      |
| `JWT_EXPIRES_HOURS`  | Horas que dura la sesión (por defecto 8)                                    |
| `DATABASE_URL`       | `postgresql://sigo_user:CONTRASEÑA@localhost:5432/sigo_db`                  |
| `ADMIN_USERNAME`     | Usuario del primer administrador                                            |
| `ADMIN_PASSWORD`     | Contraseña del primer administrador (mínimo 6 caracteres)                   |

Para generar las claves aleatorias:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Crea las tablas, el administrador y los productos de ejemplo:

```bash
python seed.py            # crea lo que falte
python seed.py --reset    # BORRA todo y lo vuelve a crear
```

### 3. Frontend

```bash
cd frontend
npm install
```

## Ejecución

Abre dos terminales:

```bash
# Terminal 1: backend en http://127.0.0.1:5000
cd backend
venv\Scripts\activate
python run.py
```

```bash
# Terminal 2: frontend en http://localhost:5173
cd frontend
npm run dev
```

Entra a <http://localhost:5173> con el administrador definido en `.env`. Desde
**Usuarios** crea las cuentas de meseros y cocina.

Para generar la versión de producción del frontend: `npm run build` (queda en `frontend/dist/`).

## API

Todas las rutas empiezan con `/api`. Salvo el login, requieren la cabecera
`Authorization: Bearer <token>`. Los errores se devuelven como `{"error": "mensaje"}`.

| Método | Ruta                          | Rol                  | Descripción                                          |
|--------|-------------------------------|----------------------|------------------------------------------------------|
| POST   | `/auth/login`                 | —                    | Inicia sesión; devuelve el token y el usuario        |
| GET    | `/auth/me`                    | todos                | Usuario de la sesión actual                          |
| GET    | `/usuarios`                   | admin                | Lista usuarios (`?rol=`, `?activo=`)                 |
| GET    | `/usuarios/<id>`              | admin                | Detalle de un usuario                                |
| POST   | `/usuarios`                   | admin                | Crea un usuario                                      |
| PUT    | `/usuarios/<id>`              | admin                | Edita, activa o desactiva un usuario                 |
| GET    | `/categorias`                 | todos                | Lista categorías                                     |
| GET    | `/categorias/<id>`            | todos                | Detalle de una categoría                             |
| POST   | `/categorias`                 | admin                | Crea una categoría                                   |
| PUT    | `/categorias/<id>`            | admin                | Edita una categoría                                  |
| DELETE | `/categorias/<id>`            | admin                | Elimina una categoría sin productos                  |
| GET    | `/productos`                  | todos                | Lista productos (`?categoria_id=`, `?disponible=`)   |
| GET    | `/productos/<id>`             | todos                | Detalle de un producto                               |
| POST   | `/productos`                  | admin                | Crea un producto                                     |
| PUT    | `/productos/<id>`             | admin                | Edita un producto                                    |
| DELETE | `/productos/<id>`             | admin                | Elimina un producto que nunca estuvo en un pedido    |
| GET    | `/pedidos`                    | todos                | Lista pedidos según el rol (`?estado=`, `?mesa=`, `?fecha=`; con `&abiertos=1` suma los de días anteriores que siguen abiertos) |
| GET    | `/pedidos/<id>`               | todos                | Detalle de un pedido                                 |
| POST   | `/pedidos`                    | mesero               | Registra un pedido                                   |
| PATCH  | `/pedidos/<id>/estado`        | según el flujo       | Cambia el estado de un pedido                        |
| GET    | `/pagos`                      | admin, mesero        | Lista pagos; el mesero solo ve los suyos (`?fecha=`, `?metodo=`) |
| GET    | `/pagos/<id>`                 | admin, mesero        | Detalle de un pago                                   |
| POST   | `/pagos`                      | mesero, admin        | Registra el pago de un pedido entregado              |
| GET    | `/reportes/dia`               | admin                | Ventas de un día (`?fecha=AAAA-MM-DD`)               |
| GET    | `/reportes/mes`               | admin                | Ventas de un mes (`?anio=&mes=`)                     |
