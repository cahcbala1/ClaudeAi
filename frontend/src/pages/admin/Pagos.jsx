import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { usePeticionVigente } from "../../utils/peticiones.js";
import { NOMBRE_METODO } from "../../estados.js";
import { fechaDeHoy, formatearHora, formatearPrecio } from "../../utils/formato.js";

// Registro de pagos. Son de solo lectura: la API no permite editarlos ni eliminarlos.
export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [metodo, setMetodo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const nuevaPeticion = usePeticionVigente();
  const cargar = useCallback(async () => {
    const parametros = new URLSearchParams();
    if (fecha) parametros.set("fecha", fecha);
    if (metodo) parametros.set("metodo", metodo);
    const vigente = nuevaPeticion();
    try {
      const respuesta = await api(`/pagos?${parametros}`);
      if (!vigente()) return;
      setPagos(respuesta);
      setError("");
    } catch (e) {
      if (vigente()) setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [fecha, metodo, nuevaPeticion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = pagos.reduce((suma, p) => suma + p.monto, 0);

  return (
    <section>
      <div className="encabezado">
        <h2>Pagos</h2>
      </div>

      <div className="filtros">
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Método
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_METODO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : pagos.length === 0 ? (
        <p className="vacio">No hay pagos con esos filtros.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Pedido</th>
              <th>Método</th>
              <th>Registrado por</th>
              <th className="numero">Monto</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id}>
                <td>{formatearHora(p.fecha)}</td>
                <td>#{p.pedido_id}</td>
                <td>{NOMBRE_METODO[p.metodo]}</td>
                <td>{p.registrado_por}</td>
                <td className="numero">{formatearPrecio(p.monto)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <strong>Total ({pagos.length} pago{pagos.length === 1 ? "" : "s"})</strong>
              </td>
              <td className="numero">
                <strong>{formatearPrecio(total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}
