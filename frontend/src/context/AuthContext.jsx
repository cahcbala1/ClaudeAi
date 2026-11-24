import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, borrarToken, configurarNoAutorizado, guardarToken, obtenerToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Mientras se valida un token guardado, no se decide a dónde redirigir.
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));

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
      .catch(cerrarSesion)
      .finally(() => setCargando(false));
  }, [cerrarSesion]);

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
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
