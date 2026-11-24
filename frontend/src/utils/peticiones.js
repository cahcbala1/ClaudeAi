import { useCallback, useRef } from "react";

// Evita que una respuesta lenta pise a otra más reciente (por ejemplo, al cambiar
// un filtro mientras se actualiza la lista). Uso:
//   const nuevaPeticion = usePeticionVigente();
//   const vigente = nuevaPeticion();
//   const datos = await api(...);
//   if (!vigente()) return;   // llegó otra petición después: se descarta esta
export function usePeticionVigente() {
  const ultima = useRef(0);
  return useCallback(() => {
    const id = ++ultima.current;
    return () => id === ultima.current;
  }, []);
}
