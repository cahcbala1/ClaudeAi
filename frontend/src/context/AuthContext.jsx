import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, borrarToken, configurarNoAutorizado, guardarToken, obtenerToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Mientras se valida un token guardado, no se decide a dónde redirigir.
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));
  const [errorInicio, setErrorInicio] = useState("");

  const cerrarSesion = useCallback(() => {
    borrarToken();
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarNoAutorizado(cerrarSesion);
  }, [cerrarSesion]);

  // Al abrir la app con un token guardado, se recupera el usuario con /auth/me.
  useEffect(() => {
    if (!obtenerToken()) return;
    api("/auth/me")
      .then(setUsuario)
      .catch((e) => {
        // Solo un 401 significa que el token ya no sirve. Si el servidor no responde
        // (por ejemplo, se está reiniciando), se conserva la sesión para reintentar.
        if (e.estado === 401) cerrarSesion();
        else setErrorInicio(e.message);
      })
      .finally(() => setCargando(false));
  }, [cerrarSesion]);

  // Actualiza los datos del usuario de la sesión (por ejemplo, si edita su propio nombre).
  const actualizarUsuario = useCallback((datos) => setUsuario((actual) => ({ ...actual, ...datos })), []);

  const iniciarSesion = async (username, password) => {
    const { access_token, usuario } = await api("/auth/login", {
      metodo: "POST",
      datos: { username, password },
    });
    guardarToken(access_token);
    setUsuario(usuario);
    return usuario;
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, errorInicio, iniciarSesion, cerrarSesion, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
