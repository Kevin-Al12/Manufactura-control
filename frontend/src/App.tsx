import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MyNotificationsPage } from "./pages/MyNotificationsPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EventTypesPage } from "./pages/EventTypesPage";
import { PlantPage } from "./pages/PlantPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SettingsPage } from "./pages/SettingsPage";

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === "ADMIN" || user?.role === "SUPERVISOR") return <DashboardPage />;
  return <MyNotificationsPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route element={<ProtectedRoute roles={["ADMIN", "SUPERVISOR"]} />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/event-types" element={<EventTypesPage />} />
            <Route path="/plant" element={<PlantPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
