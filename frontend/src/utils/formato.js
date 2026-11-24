// Formatos de presentación compartidos por las pantallas.

export const formatearPrecio = (valor) =>
  "$ " +
  Number(valor).toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
