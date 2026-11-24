// Cliente HTTP para la API de SIGO.
// Agrega el token JWT a cada petición y convierte los errores en excepciones
// con el mensaje en español que devuelve el backend ({"error": "..."}).

const CLAVE_TOKEN = "sigo_token";

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN);
export const guardarToken = (token) => localStorage.setItem(CLAVE_TOKEN, token);
export const borrarToken = () => localStorage.removeItem(CLAVE_TOKEN);

// Se llama cuando el backend responde 401 (token vencido o usuario desactivado).
let alNoAutorizado = () => {};
export const configurarNoAutorizado = (fn) => {
  alNoAutorizado = fn;
};

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

export async function api(ruta, { metodo = "GET", datos } = {}) {
  const cabeceras = {};
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (datos !== undefined) cabeceras["Content-Type"] = "application/json";

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: datos !== undefined ? JSON.stringify(datos) : undefined,
    });
  } catch {
    throw new ErrorApi("No se pudo conectar con el servidor", 0);
  }

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // En el login, un 401 significa credenciales incorrectas, no sesión vencida.
    if (respuesta.status === 401 && ruta !== "/auth/login") alNoAutorizado();
    throw new ErrorApi(cuerpo?.error || `Error ${respuesta.status}`, respuesta.status);
  }
  return cuerpo;
}
