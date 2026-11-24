import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { NOMBRE_METODO } from "../../estados.js";
import { fechaDeHoy, formatearPrecio } from "../../utils/formato.js";

// Los reportes se calculan en el backend a partir de los pagos registrados.
export default function Reportes() {
  const [modo, setModo] = useState("dia");
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [mes, setMes] = useState(fechaDeHoy().slice(0, 7)); // AAAA-MM
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true; // ignora respuestas de una consulta anterior
    const [anio, numeroMes] = mes.split("-");
    const ruta = modo === "dia" ? `/reportes/dia?fecha=${fecha}` : `/reportes/mes?anio=${anio}&mes=${Number(numeroMes)}`;
    if ((modo === "dia" && !fecha) || (modo === "mes" && !mes)) return;

    setDatos(null);
    setError("");
    api(ruta)
      .then((r) => vigente && setDatos(r))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [modo, fecha, mes]);

  const titulo =
    modo === "dia"
      ? new Date(`${fecha}T00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : new Date(`${mes}-01T00:00`).toLocaleDateString("es", { month: "long", year: "numeric" });

  return (
    <section>
      <div className="encabezado">
        <h2>Reportes de ventas</h2>
      </div>

      <div className="filtros">
        <div className="pestanas" role="tablist">
          <button type="button" role="tab" aria-selected={modo === "dia"} className={modo === "dia" ? "activa" : ""} onClick={() => setModo("dia")}>
            Por día
          </button>
          <button type="button" role="tab" aria-selected={modo === "mes"} className={modo === "mes" ? "activa" : ""} onClick={() => setModo("mes")}>
            Por mes
          </button>
        </div>
        {modo === "dia" ? (
          <label>
            Día
            <input type="date" value={fecha} max={fechaDeHoy()} onChange={(e) => setFecha(e.target.value)} />
          </label>
        ) : (
          <label>
            Mes
            <input type="month" value={mes} max={fechaDeHoy().slice(0, 7)} onChange={(e) => setMes(e.target.value)} />
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {!datos && !error && <p className="cargando">Calculando…</p>}

      {datos && (
        <>
          <h3 className="titulo-periodo">{titulo}</h3>

          <div className="indicadores">
            <Indicador etiqueta="Total vendido" valor={formatearPrecio(datos.total_ventas)} principal />
            <Indicador etiqueta="Pedidos pagados" valor={datos.pedidos_pagados} />
            <Indicador etiqueta="Ticket promedio" valor={formatearPrecio(datos.ticket_promedio)} />
            <Indicador etiqueta="Pedidos cancelados" valor={datos.pedidos_cancelados} />
          </div>

          {datos.pedidos_pagados === 0 ? (
            <p className="vacio">No hubo ventas cobradas en este periodo.</p>
          ) : (
            <>
              {modo === "mes" && <GraficoDiario anio={datos.anio} mes={datos.mes} porDia={datos.por_dia} />}

              <div className="dos-columnas">
                <div>
                  <h4>Ventas por método de pago</h4>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th className="numero">Pagos</th>
                        <th className="numero">Total</th>
                        <th className="numero">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.por_metodo.map((m) => (
                        <tr key={m.metodo}>
                          <td>{NOMBRE_METODO[m.metodo]}</td>
                          <td className="numero">{m.pagos}</td>
                          <td className="numero">{formatearPrecio(m.total)}</td>
                          <td className="numero">{Math.round((m.total / datos.total_ventas) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4>Productos más vendidos</h4>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th className="numero">Cantidad</th>
                        <th className="numero">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.productos_mas_vendidos.map((p, i) => (
                        <tr key={p.producto}>
                          <td className="nota">{i + 1}</td>
                          <td>{p.producto}</td>
                          <td className="numero">{p.cantidad}</td>
                          <td className="numero">{formatearPrecio(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {modo === "mes" && (
                <details className="detalle-tabla">
                  <summary>Ver ventas por día en tabla</summary>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th className="numero">Pedidos pagados</th>
                        <th className="numero">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.por_dia.map((d) => (
                        <tr key={d.fecha}>
                          <td>{new Date(`${d.fecha}T00:00`).toLocaleDateString("es", { weekday: "short", day: "numeric" })}</td>
                          <td className="numero">{d.pedidos_pagados}</td>
                          <td className="numero">{formatearPrecio(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function Indicador({ etiqueta, valor, principal = false }) {
  return (
    <div className={`indicador ${principal ? "principal" : ""}`}>
      <span className="etiqueta-indicador">{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

// Barras de ventas por día del mes (una sola serie, un solo color).
// Al pasar el cursor o enfocar una barra, se muestra su detalle arriba del gráfico.
function GraficoDiario({ anio, mes, porDia }) {
  const [elegido, setElegido] = useState(null);
  const diasDelMes = new Date(anio, mes, 0).getDate();
  const porNumero = new Map(porDia.map((d) => [Number(d.fecha.slice(8, 10)), d]));
  const maximo = Math.max(...porDia.map((d) => d.total));
  const nombreMes = new Date(anio, mes - 1).toLocaleDateString("es", { month: "long" });

  const detalle = elegido && porNumero.get(elegido);

  return (
    <div className="grafico">
      <div className="grafico-cabecera">
        <h4>Ventas por día</h4>
        <span className="grafico-lectura" aria-live="polite">
          {elegido
            ? `${elegido} de ${nombreMes}: ${detalle ? `${formatearPrecio(detalle.total)} · ${detalle.pedidos_pagados} pedido(s)` : "sin ventas"}`
            : `Máximo: ${formatearPrecio(maximo)}`}
        </span>
      </div>
      <div className="grafico-area" onMouseLeave={() => setElegido(null)}>
        {Array.from({ length: diasDelMes }, (_, i) => i + 1).map((dia) => {
          const d = porNumero.get(dia);
          const alto = d ? Math.max((d.total / maximo) * 100, 2) : 0;
          return (
            <div
              key={dia}
              className={`grafico-dia ${elegido === dia ? "elegido" : ""}`}
              onMouseEnter={() => setElegido(dia)}
              onFocus={() => setElegido(dia)}
              onBlur={() => setElegido(null)}
              tabIndex={0}
              aria-label={`${dia} de ${nombreMes}: ${d ? formatearPrecio(d.total) : "sin ventas"}`}
            >
              <div className="grafico-zona">{d && <div className="grafico-barra" style={{ height: `${alto}%` }} />}</div>
              <span className="grafico-etiqueta">{dia === 1 || dia % 5 === 0 ? dia : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
