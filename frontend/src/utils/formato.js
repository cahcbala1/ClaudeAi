// Formatos de presentación compartidos por las pantallas.

export const formatearPrecio = (valor) =>
  "$ " +
  Number(valor).toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// El backend envía fechas sin zona horaria ("2026-11-24T13:05:00"), en hora local.
export const formatearHora = (iso) =>
  new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

// Fecha de hoy en formato AAAA-MM-DD (el que usan los filtros de la API).
export const fechaDeHoy = () => new Date().toLocaleDateString("en-CA");
