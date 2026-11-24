import { useAuth } from "../context/AuthContext.jsx";
import { NOMBRE_ROL } from "../roles.js";

// Página de bienvenida provisional de cada rol. Se reemplaza en las siguientes etapas.
const DESCRIPCION = {
  admin: "Desde aquí administrarás usuarios, categorías, productos, pedidos y reportes.",
  mesero: "Desde aquí consultarás productos, registrarás pedidos y verás su estado.",
  cocina: "Desde aquí verás los pedidos pendientes y cambiarás su estado.",
};

export default function Inicio() {
  const { usuario } = useAuth();
  return (
    <section>
      <h2>Bienvenido, {usuario.nombre}</h2>
      <p>
        Rol: <strong>{NOMBRE_ROL[usuario.rol]}</strong>
      </p>
      <p>{DESCRIPCION[usuario.rol]}</p>
    </section>
  );
}
