import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import { formatearPrecio } from "../../utils/formato.js";

// Límites iguales a los del backend.
const MESA_MAXIMA = 999;
const CANTIDAD_MAXIMA = 100;

export default function NuevoPedido() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  // Productos elegidos: [{ producto, cantidad }]
  const [lineas, setLineas] = useState([]);
  const [mesa, setMesa] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // El mesero solo ve los productos disponibles.
  useEffect(() => {
    api("/productos?disponible=true")
      .then(setProductos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  // Categorías que tienen productos disponibles (el backend ya los ordena por categoría).
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))], [productos]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => (!categoria || p.categoria === categoria) && (!texto || p.nombre.toLowerCase().includes(texto))
    );
  }, [productos, categoria, busqueda]);

  // Agrupa los productos visibles por categoría para mostrarlos en secciones.
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const p of visibles) {
      if (!mapa.has(p.categoria)) mapa.set(p.categoria, []);
      mapa.get(p.categoria).push(p);
    }
    return [...mapa.entries()];
  }, [visibles]);

  const agregar = (producto) => {
    setLineas((actuales) => {
      const existe = actuales.find((l) => l.producto.id === producto.id);
      if (!existe) return [...actuales, { producto, cantidad: 1 }];
      return actuales.map((l) =>
        l.producto.id === producto.id ? { ...l, cantidad: Math.min(l.cantidad + 1, CANTIDAD_MAXIMA) } : l
      );
    });
  };

  const cambiarCantidad = (productoId, cambio) => {
    setLineas((actuales) =>
      actuales
        .map((l) =>
          l.producto.id === productoId ? { ...l, cantidad: Math.min(l.cantidad + cambio, CANTIDAD_MAXIMA) } : l
        )
        .filter((l) => l.cantidad > 0)
    );
  };

  const quitar = (productoId) => setLineas((actuales) => actuales.filter((l) => l.producto.id !== productoId));

  // Total estimado; el backend lo recalcula con los precios de la base de datos.
  const total = lineas.reduce((suma, l) => suma + l.producto.precio * l.cantidad, 0);
  const cantidadEnPedido = (productoId) => lineas.find((l) => l.producto.id === productoId)?.cantidad ?? 0;

  const registrar = async (e) => {
    e.preventDefault();
    const numeroMesa = Number(mesa);
    if (!Number.isInteger(numeroMesa) || numeroMesa < 1 || numeroMesa > MESA_MAXIMA) {
      setError(`La mesa debe ser un número entre 1 y ${MESA_MAXIMA}`);
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un producto al pedido");
      return;
    }

    setError("");
    setEnviando(true);
    try {
      const pedido = await api("/pedidos", {
        metodo: "POST",
        datos: {
          mesa: numeroMesa,
          observaciones: observaciones.trim(),
          detalles: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
        },
      });
      navigate("/mesero", {
        state: { aviso: `Pedido #${pedido.id} registrado para la mesa ${pedido.mesa} (${formatearPrecio(pedido.total)}).` },
      });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <section>
      <div className="encabezado">
        <h2>Nuevo pedido</h2>
        <Link to="/mesero" className="boton-enlace secundario">
          Volver a mis pedidos
        </Link>
      </div>

      <div className="nuevo-pedido">
        {/* ---------- Carta ---------- */}
        <div className="carta">
          <div className="filtros">
            <label>
              Buscar
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre del producto"
              />
            </label>
            <label>
              Categoría
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {cargando ? (
            <p className="cargando">Cargando carta…</p>
          ) : productos.length === 0 ? (
            <p className="vacio">No hay productos disponibles. Pide al administrador que los active.</p>
          ) : grupos.length === 0 ? (
            <p className="vacio">Ningún producto coincide con la búsqueda.</p>
          ) : (
            grupos.map(([nombreCategoria, lista]) => (
              <div key={nombreCategoria} className="grupo-carta">
                <h3>{nombreCategoria}</h3>
                <div className="productos-carta">
                  {lista.map((p) => {
                    const enPedido = cantidadEnPedido(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        className={`producto-carta ${enPedido ? "elegido" : ""}`}
                        onClick={() => agregar(p)}
                        title={p.descripcion || ""}
                      >
                        <span className="nombre">{p.nombre}</span>
                        <span className="precio">{formatearPrecio(p.precio)}</span>
                        {enPedido > 0 && <span className="contador">{enPedido}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ---------- Pedido en curso ---------- */}
        <form className="resumen-pedido" onSubmit={registrar}>
          <h3>Pedido</h3>
          <label>
            Mesa
            <input
              type="number"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              min="1"
              max={MESA_MAXIMA}
              step="1"
              required
            />
          </label>

          {lineas.length === 0 ? (
            <p className="vacio">Toca un producto de la carta para agregarlo.</p>
          ) : (
            <ul className="lineas-editables">
              {lineas.map(({ producto, cantidad }) => (
                <li key={producto.id}>
                  <div className="linea-info">
                    <span>{producto.nombre}</span>
                    <span className="nota">{formatearPrecio(producto.precio * cantidad)}</span>
                  </div>
                  <div className="cantidad">
                    <button type="button" className="boton-secundario" onClick={() => cambiarCantidad(producto.id, -1)} aria-label="Quitar uno">
                      −
                    </button>
                    <span>{cantidad}</span>
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => cambiarCantidad(producto.id, 1)}
                      disabled={cantidad >= CANTIDAD_MAXIMA}
                      aria-label="Agregar uno"
                    >
                      +
                    </button>
                    <button type="button" className="boton-peligro" onClick={() => quitar(producto.id)} aria-label="Quitar producto">
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <label>
            Observaciones <small className="nota">(opcional)</small>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              maxLength={255}
              rows={2}
              placeholder="Ej.: sin cebolla, término medio"
            />
          </label>

          <div className="total-pedido">
            <span>Total</span>
            <strong>{formatearPrecio(total)}</strong>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={enviando || lineas.length === 0}>
            {enviando ? "Registrando…" : "Registrar pedido"}
          </button>
        </form>
      </div>
    </section>
  );
}
