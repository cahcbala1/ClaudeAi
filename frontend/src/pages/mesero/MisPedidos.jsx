import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import ModalCobro from "../../components/ModalCobro.jsx";
import TarjetaPedido from "../../components/TarjetaPedido.jsx";
import { NOMBRE_ESTADO } from "../../estados.js";
import { fechaDeHoy, formatearPrecio } from "../../utils/formato.js";

// Cada cuánto se vuelve a consultar la lista, para ver los cambios que hace la cocina.
const INTERVALO_MS = 15000;

export default function MisPedidos() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [estado, setEstado] = useState("");
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Mensaje que deja la pantalla "Nuevo pedido" al registrar uno.
  const [aviso, setAviso] = useState(location.state?.aviso ?? "");
  const [cobrando, setCobrando] = useState(null);

  // Se limpia el aviso del historial para que no reaparezca al recargar.
  useEffect(() => {
    if (location.state?.aviso) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const cargar = useCallback(async () => {
    const parametros = new URLSearchParams();
    if (estado) parametros.set("estado", estado);
    if (fecha) parametros.set("fecha", fecha);
    try {
      setPedidos(await api(`/pedidos?${parametros}`));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [estado, fecha]);

  useEffect(() => {
    cargar();
    const temporizador = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  const cambiarEstado = async (pedido, nuevo) => {
    if (nuevo === "cancelado" && !confirm(`¿Cancelar el pedido #${pedido.id} de la mesa ${pedido.mesa}?`)) return;
    setAviso("");
    try {
      await api(`/pedidos/${pedido.id}/estado`, { metodo: "PATCH", datos: { estado: nuevo } });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const listos = pedidos.filter((p) => p.estado === "listo").length;

  return (
    <section>
      <div className="encabezado">
        <h2>Mis pedidos</h2>
        <Link to="/mesero/nuevo" className="boton-enlace">
          + Nuevo pedido
        </Link>
      </div>

      {aviso && <p className="aviso">{aviso}</p>}
      {listos > 0 && (
        <p className="aviso destacado">
          {listos === 1 ? "Hay 1 pedido listo" : `Hay ${listos} pedidos listos`} para entregar.
        </p>
      )}

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
            <TarjetaPedido key={p.id} pedido={p}>
              {p.estado === "listo" && (
                <button type="button" onClick={() => cambiarEstado(p, "entregado")}>
                  Marcar entregado
                </button>
              )}
              {p.estado === "entregado" && !p.pagado && (
                <button type="button" onClick={() => setCobrando(p)}>
                  Cobrar
                </button>
              )}
              {p.estado === "pendiente" && (
                <button type="button" className="boton-peligro" onClick={() => cambiarEstado(p, "cancelado")}>
                  Cancelar
                </button>
              )}
            </TarjetaPedido>
          ))}
        </div>
      )}

      {cobrando && (
        <ModalCobro
          pedido={cobrando}
          onCobrado={() => {
            setAviso(`Pago del pedido #${cobrando.id} registrado (${formatearPrecio(cobrando.total)}).`);
            setCobrando(null);
            cargar();
          }}
          onCerrar={() => setCobrando(null)}
        />
      )}
    </section>
  );
}
