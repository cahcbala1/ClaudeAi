import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import Modal from "../../components/Modal.jsx";

// Solo se pueden eliminar categorías sin productos (lo valida también el backend).
export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // null = formulario cerrado, {} = nueva categoría, objeto = categoría a editar.
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError("");
      setCategorias(await api("/categorias"));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    try {
      await api(`/categorias/${c.id}`, { metodo: "DELETE" });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const alGuardar = () => {
    setEditando(null);
    cargar();
  };

  return (
    <section>
      <div className="encabezado">
        <h2>Categorías</h2>
        <button type="button" onClick={() => setEditando({})}>
          + Nueva categoría
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : categorias.length === 0 ? (
        <p className="vacio">Aún no hay categorías. Crea la primera para poder registrar productos.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th className="numero">Productos</th>
              <th className="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td className="nota">{c.descripcion || "—"}</td>
                <td className="numero">{c.total_productos}</td>
                <td className="acciones">
                  <button type="button" className="boton-secundario" onClick={() => setEditando(c)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="boton-peligro"
                    onClick={() => eliminar(c)}
                    disabled={c.total_productos > 0}
                    title={c.total_productos > 0 ? "Tiene productos: muévelos a otra categoría primero" : ""}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && <FormCategoria categoria={editando} onGuardado={alGuardar} onCerrar={() => setEditando(null)} />}
    </section>
  );
}

function FormCategoria({ categoria, onGuardado, onCerrar }) {
  const esNueva = !categoria.id;
  const [nombre, setNombre] = useState(categoria.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria.descripcion ?? "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api(esNueva ? "/categorias" : `/categorias/${categoria.id}`, {
        metodo: esNueva ? "POST" : "PUT",
        datos: { nombre: nombre.trim(), descripcion: descripcion.trim() },
      });
      onGuardado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={esNueva ? "Nueva categoría" : "Editar categoría"} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={80} required />
        </label>
        <label>
          Descripción <small className="nota">(opcional)</small>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={255} rows={3} />
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
