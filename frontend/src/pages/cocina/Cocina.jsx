import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import TarjetaPedido from "../../components/TarjetaPedido.jsx";
import { fechaDeHoy } from "../../utils/formato.js";

// La cocina necesita ver los pedidos nuevos rápido: se consulta cada 10 segundos.
const INTERVALO_MS = 10000;
// A partir de estos minutos de espera, el pedido se resalta como demorado.
const MINUTOS_DEMORA = 15;

const COLUMNAS = [
  { estado: "pendiente", titulo: "Pendientes", accion: { texto: "Empezar a preparar", siguiente: "en_preparacion" } },
  { estado: "en_preparacion", titulo: "En preparación", accion: { texto: "Marcar listo", siguiente: "listo" } },
  { estado: "listo", titulo: "Listos (esperando al mesero)", accion: null },
];

const minutosDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

export default function Cocina() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Pedidos con un cambio de estado en curso (evita dobles clics).
  const [enProceso, setEnProceso] = useState(new Set());

  const cargar = useCallback(async () => {
    try {
      // Sin filtro, la API devuelve a cocina los pendientes y en preparación (más antiguos primero).
      // Los listos se piden aparte y solo los de hoy.
      const [activos, listos] = await Promise.all([
        api("/pedidos"),
        api(`/pedidos?estado=listo&fecha=${fechaDeHoy()}&abiertos=1`),
      ]);
      setPedidos([...activos, ...listos]);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const temporizador = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  const avanzar = async (pedido, siguiente) => {
    setEnProceso((s) => new Set(s).add(pedido.id));
    try {
      await api(`/pedidos/${pedido.id}/estado`, { metodo: "PATCH", datos: { estado: siguiente } });
      await cargar();
    } catch (e) {
      // Por ejemplo, si el mesero canceló el pedido mientras tanto.
      setError(e.message);
      cargar();
    } finally {
      setEnProceso((s) => {
        const copia = new Set(s);
        copia.delete(pedido.id);
        return copia;
      });
    }
  };

  return (
    <section>
      <div className="encabezado">
        <h2>Pedidos de cocina</h2>
        <span className="nota">Se actualiza automáticamente</span>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : (
        <div className="tablero">
          {COLUMNAS.map(({ estado, titulo, accion }) => {
            const lista = pedidos.filter((p) => p.estado === estado);
            return (
              <div key={estado} className="columna">
                <h3>
                  {titulo} <span className="contador-columna">{lista.length}</span>
                </h3>
                {lista.length === 0 ? (
                  <p className="vacio">Sin pedidos.</p>
                ) : (
                  lista.map((p) => {
                    const espera = minutosDesde(p.creado_en);
                    const demorado = accion && espera >= MINUTOS_DEMORA;
                    return (
                      <div key={p.id} className={demorado ? "demorado" : ""}>
                        <TarjetaPedido pedido={p}>
                          {accion && (
                            <>
                              <span className="espera">{espera < 1 ? "Recién llegado" : `Hace ${espera} min`}</span>
                              <button type="button" onClick={() => avanzar(p, accion.siguiente)} disabled={enProceso.has(p.id)}>
                                {accion.texto}
                              </button>
                            </>
                          )}
                        </TarjetaPedido>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
