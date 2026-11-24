import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { NOMBRE_ROL } from "../roles.js";

// Enlaces del menú según el rol. Las páginas se irán agregando en las siguientes etapas.
const MENU = {
  admin: [
    { a: "/admin", texto: "Inicio" },
    { a: "/admin/usuarios", texto: "Usuarios" },
    { a: "/admin/categorias", texto: "Categorías" },
    { a: "/admin/productos", texto: "Productos" },
  ],
  mesero: [
    { a: "/mesero", texto: "Mis pedidos" },
    { a: "/mesero/nuevo", texto: "Nuevo pedido" },
  ],
  cocina: [{ a: "/cocina", texto: "Inicio" }],
};

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <div className="layout">
      <header className="barra">
        <span className="marca">SIGO</span>
        <nav>
          {MENU[usuario.rol].map((enlace) => (
            <NavLink key={enlace.a} to={enlace.a} end>
              {enlace.texto}
            </NavLink>
          ))}
        </nav>
        <div className="sesion">
          <span>
            {usuario.nombre} · <small>{NOMBRE_ROL[usuario.rol]}</small>
          </span>
          <button type="button" className="boton-secundario" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
