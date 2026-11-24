import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import ModalCobro from "../../components/ModalCobro.jsx";
import TarjetaPedido from "../../components/TarjetaPedido.jsx";
import { NOMBRE_ESTADO } from "../../estados.js";
import { fechaDeHoy, formatearPrecio } from "../../utils/formato.js";

const INTERVALO_MS = 15000;

// El administrador ve todos los pedidos, puede cancelar los pendientes y cobrar los entregados.
export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [estado, setEstado] = useState("");
  const [mesa, setMesa] = useState("");
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cobrando, setCobrando] = useState(null);

  const cargar = useCallback(async () => {
    const parametros = new URLSearchParams();
    if (estado) parametros.set("estado", estado);
    if (/^\d+$/.test(mesa)) parametros.set("mesa", mesa);
    if (fecha) parametros.set("fecha", fecha);
    try {
      setPedidos(await api(`/pedidos?${parametros}`));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [estado, mesa, fecha]);

  useEffect(() => {
    cargar();
    const temporizador = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  const cancelar = async (pedido) => {
    if (!confirm(`¿Cancelar el pedido #${pedido.id} de la mesa ${pedido.mesa}?`)) return;
    setAviso("");
    try {
      await api(`/pedidos/${pedido.id}/estado`, { metodo: "PATCH", datos: { estado: "cancelado" } });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const alCobrar = () => {
    setAviso(`Pago del pedido #${cobrando.id} registrado (${formatearPrecio(cobrando.total)}).`);
    setCobrando(null);
    cargar();
  };

  const porCobrar = pedidos.filter((p) => p.estado === "entregado" && !p.pagado);

  return (
    <section>
      <div className="encabezado">
        <h2>Pedidos</h2>
        <span className="nota">
          {pedidos.length} pedido(s)
          {porCobrar.length > 0 &&
            ` · ${porCobrar.length} por cobrar (${formatearPrecio(porCobrar.reduce((s, p) => s + p.total, 0))})`}
        </span>
      </div>

      {aviso && <p className="aviso">{aviso}</p>}

      <div className="filtros">
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ESTADO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mesa
          <input type="number" min="1" value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Todas" />
        </label>
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        {fecha !== fechaDeHoy() && (
          <button type="button" className="boton-secundario alinear-abajo" onClick={() => setFecha(fechaDeHoy())}>
            Volver a hoy
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <p className="vacio">No hay pedidos con esos filtros.</p>
      ) : (
        <div className="cuadricula-pedidos">
          {pedidos.map((p) => (
            <TarjetaPedido key={p.id} pedido={p} mostrarMesero>
              {p.estado === "entregado" && !p.pagado && (
                <button type="button" onClick={() => setCobrando(p)}>
                  Cobrar
                </button>
              )}
              {p.estado === "pendiente" && (
                <button type="button" className="boton-peligro" onClick={() => cancelar(p)}>
                  Cancelar
                </button>
              )}
            </TarjetaPedido>
          ))}
        </div>
      )}

      {cobrando && <ModalCobro pedido={cobrando} onCobrado={alCobrar} onCerrar={() => setCobrando(null)} />}
    </section>
  );
}
