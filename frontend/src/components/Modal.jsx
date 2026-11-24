import { useEffect, useRef } from "react";

// Ventana modal basada en <dialog>: el navegador se encarga del fondo oscuro,
// de cerrar con la tecla Escape y de mantener el foco dentro del formulario.
export default function Modal({ titulo, onCerrar, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onCerrar}>
      <h3>{titulo}</h3>
      {children}
    </dialog>
  );
}
