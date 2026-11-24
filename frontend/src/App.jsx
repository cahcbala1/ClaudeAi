import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import Inicio from "./pages/Inicio.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route element={<RutaProtegida roles={["admin"]} />}>
            <Route path="/admin" element={<Inicio />} />
          </Route>
          <Route element={<RutaProtegida roles={["mesero"]} />}>
            <Route path="/mesero" element={<Inicio />} />
          </Route>
          <Route element={<RutaProtegida roles={["cocina"]} />}>
            <Route path="/cocina" element={<Inicio />} />
          </Route>
        </Route>
      </Route>

      {/* Cualquier otra ruta: al login, que redirige según la sesión. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
