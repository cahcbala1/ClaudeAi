import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import Inicio from "./pages/Inicio.jsx";
import Login from "./pages/Login.jsx";
import Categorias from "./pages/admin/Categorias.jsx";
import Productos from "./pages/admin/Productos.jsx";
import Usuarios from "./pages/admin/Usuarios.jsx";
import Cocina from "./pages/cocina/Cocina.jsx";
import MisPedidos from "./pages/mesero/MisPedidos.jsx";
import NuevoPedido from "./pages/mesero/NuevoPedido.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route element={<RutaProtegida roles={["admin"]} />}>
            <Route path="/admin" element={<Inicio />} />
            <Route path="/admin/usuarios" element={<Usuarios />} />
            <Route path="/admin/categorias" element={<Categorias />} />
            <Route path="/admin/productos" element={<Productos />} />
          </Route>
          <Route element={<RutaProtegida roles={["mesero"]} />}>
            <Route path="/mesero" element={<MisPedidos />} />
            <Route path="/mesero/nuevo" element={<NuevoPedido />} />
          </Route>
          <Route element={<RutaProtegida roles={["cocina"]} />}>
            <Route path="/cocina" element={<Cocina />} />
          </Route>
        </Route>
      </Route>

      {/* Cualquier otra ruta: al login, que redirige según la sesión. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
