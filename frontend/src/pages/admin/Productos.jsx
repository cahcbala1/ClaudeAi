import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { usePeticionVigente } from "../../utils/peticiones.js";
import Modal from "../../components/Modal.jsx";
import { formatearPrecio } from "../../utils/formato.js";

// Un producto que ya está en pedidos no se puede eliminar: se marca como no disponible.
export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDisponible, setFiltroDisponible] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // null = formulario cerrado, {} = nuevo producto, objeto = producto a editar.
  const [editando, setEditando] = useState(null);

  const nuevaPeticion = usePeticionVigente();
  const cargar = useCallback(async () => {
    const parametros = new URLSearchParams();
    if (filtroCategoria) parametros.set("categoria_id", filtroCategoria);
    if (filtroDisponible) parametros.set("disponible", filtroDisponible);
    const vigente = nuevaPeticion();
    try {
      const [listaProductos, listaCategorias] = await Promise.all([
        api(`/productos?${parametros}`),
        api("/categorias"),
      ]);
      if (!vigente()) return;
      setError("");
      setProductos(listaProductos);
      setCategorias(listaCategorias);
    } catch (e) {
      if (vigente()) setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [filtroCategoria, filtroDisponible, nuevaPeticion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarDisponible = async (p) => {
    try {
      await api(`/productos/${p.id}`, { metodo: "PUT", datos: { disponible: !p.disponible } });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar el producto "${p.nombre}"?`)) return;
    try {
      await api(`/productos/${p.id}`, { metodo: "DELETE" });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const alGuardar = () => {
    setEditando(null);
    cargar();
  };

  const sinCategorias = !cargando && categorias.length === 0;

  return (
    <section>
      <div className="encabezado">
        <h2>Productos</h2>
        <button type="button" onClick={() => setEditando({})} disabled={sinCategorias}>
          + Nuevo producto
        </button>
      </div>

      {sinCategorias && <p className="vacio">Primero crea al menos una categoría para registrar productos.</p>}

      <div className="filtros">
        <label>
          Categoría
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Disponibilidad
          <select value={filtroDisponible} onChange={(e) => setFiltroDisponible(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : productos.length === 0 ? (
        !sinCategorias && <p className="vacio">No hay productos con esos filtros.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="numero">Precio</th>
              <th>Disponible</th>
              <th className="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={p.disponible ? "" : "inactivo"}>
                <td>
                  {p.nombre}
                  {p.descripcion && <div className="nota">{p.descripcion}</div>}
                </td>
                <td>{p.categoria}</td>
                <td className="numero">{formatearPrecio(p.precio)}</td>
                <td>
                  <label className="interruptor" title="Cambiar disponibilidad">
                    <input type="checkbox" checked={p.disponible} onChange={() => cambiarDisponible(p)} />
                    {p.disponible ? "Sí" : "No"}
                  </label>
                </td>
                <td className="acciones">
                  <button type="button" className="boton-secundario" onClick={() => setEditando(p)}>
                    Editar
                  </button>
                  <button type="button" className="boton-peligro" onClick={() => eliminar(p)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && (
        <FormProducto
          producto={editando}
          categorias={categorias}
          onGuardado={alGuardar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

function FormProducto({ producto, categorias, onGuardado, onCerrar }) {
  const esNuevo = !producto.id;
  const [nombre, setNombre] = useState(producto.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto.descripcion ?? "");
  const [precio, setPrecio] = useState(producto.precio != null ? producto.precio.toFixed(2) : "");
  const [categoriaId, setCategoriaId] = useState(String(producto.categoria_id ?? categorias[0]?.id ?? ""));
  const [disponible, setDisponible] = useState(producto.disponible ?? true);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api(esNuevo ? "/productos" : `/productos/${producto.id}`, {
        metodo: esNuevo ? "POST" : "PUT",
        datos: {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: precio.trim(),
          categoria_id: Number(categoriaId),
          disponible,
        },
      });
      onGuardado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={esNuevo ? "Nuevo producto" : "Editar producto"} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={100} required />
        </label>
        <label>
          Descripción <small className="nota">(opcional)</small>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={255} rows={2} />
        </label>
        <div className="fila">
          <label>
            Precio
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            Categoría
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="interruptor">
          <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} />
          Disponible para pedidos
        </label>

        {error && <p className="error">{error}</p>}

        <div className="botones">
          <button type="button" className="boton-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
