import { NOMBRE_ESTADO } from "../estados.js";
import { formatearHora, formatearPrecio } from "../utils/formato.js";

// Muestra un pedido con sus productos. Los botones de acción los decide cada pantalla.
export default function TarjetaPedido({ pedido, children }) {
  return (
    <article className={`tarjeta-pedido estado-${pedido.estado}`}>
      <header>
        <div>
          <strong>Mesa {pedido.mesa}</strong>
          <span className="nota"> · Pedido #{pedido.id} · {formatearHora(pedido.creado_en)}</span>
        </div>
        <span className={`estado estado-${pedido.estado}`}>{NOMBRE_ESTADO[pedido.estado]}</span>
      </header>

      <ul className="lineas">
        {pedido.detalles.map((d) => (
          <li key={d.id}>
            <span>
              {d.cantidad} × {d.producto}
            </span>
            <span className="nota">{formatearPrecio(d.subtotal)}</span>
          </li>
        ))}
      </ul>

      {pedido.observaciones && <p className="observaciones">📝 {pedido.observaciones}</p>}

      <footer>
        <strong>Total: {formatearPrecio(pedido.total)}</strong>
        {children && <div className="acciones-pedido">{children}</div>}
      </footer>
    </article>
  );
}
