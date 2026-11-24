import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import Modal from "../../components/Modal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { NOMBRE_ROL } from "../../roles.js";

// Los usuarios no se eliminan: se desactivan para conservar su historial.
export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // null = formulario cerrado, {} = nuevo usuario, objeto = usuario a editar.
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    const parametros = new URLSearchParams();
    if (filtroRol) parametros.set("rol", filtroRol);
    if (filtroActivo) parametros.set("activo", filtroActivo);
    try {
      setError("");
      setUsuarios(await api(`/usuarios?${parametros}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [filtroRol, filtroActivo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (u) => {
    if (u.activo && !confirm(`¿Desactivar a ${u.nombre}? Ya no podrá iniciar sesión.`)) return;
    try {
      await api(`/usuarios/${u.id}`, { metodo: "PUT", datos: { activo: !u.activo } });
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
        <h2>Usuarios</h2>
        <button type="button" onClick={() => setEditando({})}>
          + Nuevo usuario
        </button>
      </div>

      <div className="filtros">
        <label>
          Rol
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ROL).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : usuarios.length === 0 ? (
        <p className="vacio">No hay usuarios con esos filtros.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th className="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={u.activo ? "" : "inactivo"}>
                <td>
                  {u.nombre}
                  {u.id === yo.id && <small className="nota"> (tú)</small>}
                </td>
                <td>{u.username}</td>
                <td>{NOMBRE_ROL[u.rol]}</td>
                <td>
                  <span className={`etiqueta ${u.activo ? "ok" : "apagada"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="acciones">
                  <button type="button" className="boton-secundario" onClick={() => setEditando(u)}>
                    Editar
                  </button>
                  {u.id !== yo.id && (
                    <button type="button" className="boton-secundario" onClick={() => cambiarEstado(u)}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && (
        <FormUsuario
          usuario={editando}
          esPropio={editando.id === yo.id}
          onGuardado={alGuardar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

function FormUsuario({ usuario, esPropio, onGuardado, onCerrar }) {
  const esNuevo = !usuario.id;
  const [nombre, setNombre] = useState(usuario.nombre ?? "");
  const [username, setUsername] = useState(usuario.username ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState(usuario.rol ?? "mesero");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const datos = { nombre: nombre.trim(), username: username.trim(), rol };
    // Al editar, la contraseña solo se cambia si se escribe una nueva.
    if (esNuevo || password) datos.password = password;

    setError("");
    setEnviando(true);
    try {
      await api(esNuevo ? "/usuarios" : `/usuarios/${usuario.id}`, {
        metodo: esNuevo ? "POST" : "PUT",
        datos,
      });
      onGuardado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={esNuevo ? "Nuevo usuario" : "Editar usuario"} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar}>
        <label>
          Nombre completo
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={100} required />
        </label>
        <label>
          Usuario
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            pattern="[A-Za-z0-9_.]{3,50}"
            title="De 3 a 50 caracteres: letras, números, punto o guion bajo"
            required
          />
        </label>
        <label>
          {esNuevo ? "Contraseña" : "Nueva contraseña"}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required={esNuevo}
            placeholder={esNuevo ? "" : "Déjala vacía para no cambiarla"}
            autoComplete="new-password"
          />
        </label>
        <label>
          Rol
          <select value={rol} onChange={(e) => setRol(e.target.value)} disabled={esPropio}>
            {Object.entries(NOMBRE_ROL).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {esPropio && <small className="nota">No puedes cambiar tu propio rol.</small>}
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
