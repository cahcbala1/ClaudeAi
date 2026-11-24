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

// Hora del pedido; si no es de hoy, antepone la fecha ("23/11 23:55").
export const formatearMomento = (iso) => {
  const momento = new Date(iso);
  const hora = formatearHora(iso);
  if (momento.toLocaleDateString("en-CA") === fechaDeHoy()) return hora;
  return `${momento.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })} ${hora}`;
};

// Fecha de hoy en formato AAAA-MM-DD (el que usan los filtros de la API).
export const fechaDeHoy = () => new Date().toLocaleDateString("en-CA");
