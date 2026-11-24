import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { INICIO_POR_ROL } from "../roles.js";

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <p className="cargando">Cargando…</p>;
  // Con sesión iniciada, se va directo a la página de su rol.
  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesion(username.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pantalla-login">
      <form className="tarjeta-login" onSubmit={enviar}>
        <h1>SIGO</h1>
        <p className="subtitulo">Sistema de Gestión de Pedidos</p>

        <label>
          Usuario
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
