import { useState } from "react";

import { api } from "../api/client.js";
import { NOMBRE_METODO } from "../estados.js";
import { formatearPrecio } from "../utils/formato.js";
import Modal from "./Modal.jsx";

// Registra el pago de un pedido entregado. El monto lo fija el backend (total del pedido).
export default function ModalCobro({ pedido, onCobrado, onCerrar }) {
  const [metodo, setMetodo] = useState("efectivo");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cobrar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api("/pagos", { metodo: "POST", datos: { pedido_id: pedido.id, metodo } });
      onCobrado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Cobrar pedido #${pedido.id} · Mesa ${pedido.mesa}`} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={cobrar}>
        <div className="total-pedido">
          <span>Total a cobrar</span>
          <strong>{formatearPrecio(pedido.total)}</strong>
        </div>

        <fieldset className="opciones">
          <legend>Método de pago</legend>
          {Object.entries(NOMBRE_METODO).map(([valor, texto]) => (
            <label key={valor} className={`opcion ${metodo === valor ? "elegida" : ""}`}>
              <input
                type="radio"
                name="metodo"
                value={valor}
                checked={metodo === valor}
                onChange={() => setMetodo(valor)}
              />
              {texto}
            </label>
          ))}
        </fieldset>

        {error && <p className="error">{error}</p>}

        <div className="botones">
          <button type="button" className="boton-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando}>
            {enviando ? "Registrando…" : "Registrar pago"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
