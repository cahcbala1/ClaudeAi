import { NOMBRE_ESTADO } from "../estados.js";
import { formatearHora, formatearPrecio } from "../utils/formato.js";

// Muestra un pedido con sus productos. Los botones de acción los decide cada pantalla.
// mostrarMesero: el administrador ve quién registró cada pedido.
export default function TarjetaPedido({ pedido, mostrarMesero = false, children }) {
  return (
    <article className={`tarjeta-pedido estado-${pedido.estado}`}>
      <header>
        <div>
          <strong>Mesa {pedido.mesa}</strong>
          <span className="nota"> · Pedido #{pedido.id} · {formatearHora(pedido.creado_en)}</span>
          {mostrarMesero && <div className="nota">Mesero: {pedido.mesero}</div>}
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
        <div>
          <strong>Total: {formatearPrecio(pedido.total)}</strong>
          {pedido.estado === "entregado" && (
            <span className={`etiqueta ${pedido.pagado ? "ok" : "pendiente-pago"}`}>
              {pedido.pagado ? "Pagado" : "Por cobrar"}
            </span>
          )}
        </div>
        {children && <div className="acciones-pedido">{children}</div>}
      </footer>
    </article>
  );
}
