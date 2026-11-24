import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import Indicador from "../../components/Indicador.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { fechaDeHoy, formatearPrecio } from "../../utils/formato.js";

const INTERVALO_MS = 30000;

const ATAJOS = [
  { a: "/admin/pedidos", titulo: "Pedidos", texto: "Ver, cancelar y cobrar pedidos." },
  { a: "/admin/pagos", titulo: "Pagos", texto: "Registro de pagos por fecha y método." },
  { a: "/admin/reportes", titulo: "Reportes", texto: "Ventas por día y por mes." },
  { a: "/admin/productos", titulo: "Productos", texto: "Carta, precios y disponibilidad." },
  { a: "/admin/categorias", titulo: "Categorías", texto: "Grupos de la carta." },
  { a: "/admin/usuarios", titulo: "Usuarios", texto: "Meseros, cocina y administradores." },
];

// Panel de inicio del administrador: resumen del día y accesos directos.
export default function Panel() {
  const { usuario } = useAuth();
  const [ventas, setVentas] = useState(null);
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const hoy = fechaDeHoy();
    try {
      const [reporte, lista] = await Promise.all([api(`/reportes/dia?fecha=${hoy}`), api(`/pedidos?fecha=${hoy}&abiertos=1`)]);
      setVentas(reporte);
      setPedidos(lista);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const temporizador = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  const contar = (condicion) => (pedidos ? pedidos.filter(condicion).length : 0);
  const enCocina = contar((p) => p.estado === "pendiente" || p.estado === "en_preparacion");
  const porEntregar = contar((p) => p.estado === "listo");
  const porCobrar = pedidos ? pedidos.filter((p) => p.estado === "entregado" && !p.pagado) : [];
  const montoPorCobrar = porCobrar.reduce((suma, p) => suma + p.total, 0);

  const hoyTexto = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <div className="encabezado">
        <div>
          <h2>Bienvenido, {usuario.nombre}</h2>
          <p className="subtitulo-panel">Resumen de hoy, {hoyTexto}</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!ventas && !error && <p className="cargando">Cargando…</p>}

      {ventas && pedidos && (
        <>
          <div className="indicadores">
            <Indicador etiqueta="Vendido hoy" valor={formatearPrecio(ventas.total_ventas)} nota={`${ventas.pedidos_pagados} pedido(s) cobrado(s)`} principal a="/admin/reportes" />
            <Indicador etiqueta="En cocina" valor={enCocina} nota="Pendientes y en preparación" a="/admin/pedidos" />
            <Indicador etiqueta="Listos para entregar" valor={porEntregar} nota="Esperando al mesero" a="/admin/pedidos" />
            <Indicador etiqueta="Por cobrar" valor={porCobrar.length} nota={formatearPrecio(montoPorCobrar)} a="/admin/pedidos" />
          </div>

          {pedidos.length === 0 && <p className="vacio">Todavía no hay pedidos hoy.</p>}
        </>
      )}

      <h3 className="titulo-atajos">Accesos directos</h3>
      <div className="atajos">
        {ATAJOS.map((atajo) => (
          <Link key={atajo.a} to={atajo.a} className="atajo">
            <strong>{atajo.titulo}</strong>
            <span>{atajo.texto}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
