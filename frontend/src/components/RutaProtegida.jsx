import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { INICIO_POR_ROL } from "../roles.js";

// Solo deja pasar a usuarios con sesión y con uno de los roles permitidos.
// Si el rol no corresponde, lo envía a su propia página de inicio.
export default function RutaProtegida({ roles }) {
  const { usuario, cargando, errorInicio } = useAuth();

  if (cargando) return <p className="cargando">Cargando…</p>;
  // El servidor no respondió al validar la sesión guardada: se ofrece reintentar sin perderla.
  if (!usuario && errorInicio) {
    return (
      <div className="cargando">
        <p className="error">{errorInicio}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  }
  return <Outlet />;
}
