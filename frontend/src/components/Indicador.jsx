// Tarjeta con un número destacado y su etiqueta (panel de inicio y reportes).
// Si recibe "a", la tarjeta entera es un enlace a esa ruta.
import { Link } from "react-router-dom";

export default function Indicador({ etiqueta, valor, principal = false, a, nota }) {
  const clase = `indicador ${principal ? "principal" : ""} ${a ? "enlace" : ""}`;
  const contenido = (
    <>
      <span className="etiqueta-indicador">{etiqueta}</span>
      <strong>{valor}</strong>
      {nota && <span className="nota-indicador">{nota}</span>}
    </>
  );
  return a ? (
    <Link to={a} className={clase}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
