import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminAuthProvider } from "@/hooks/admin/useAdminAuth";
import { AdminGuard } from "@/components/admin/shared/AdminGuard";

// Public pages
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import VehicleDetail from "./pages/VehicleDetail";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminVehicleForm from "./pages/admin/AdminVehicleForm";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminImport from "./pages/admin/AdminImport";
import AdminImportHistory from "./pages/admin/AdminImportHistory";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminSetup from "./pages/admin/AdminSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <Routes>
              {/* ── Public routes ─────────────────────────────── */}
              <Route path="/" element={<Index />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/veiculo/:id" element={<VehicleDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancelado" element={<CheckoutCancel />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* ── Admin routes ──────────────────────────────── */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/setup" element={<AdminSetup />} />

              <Route
                path="/admin/dashboard"
                element={<AdminGuard><AdminDashboard /></AdminGuard>}
              />
              <Route
                path="/admin/veiculos"
                element={<AdminGuard><AdminVehicles /></AdminGuard>}
              />
              <Route
                path="/admin/veiculos/novo"
                element={<AdminGuard requiredRole="ADMIN"><AdminVehicleForm /></AdminGuard>}
              />
              <Route
                path="/admin/veiculos/:id/editar"
                element={<AdminGuard requiredRole="ADMIN"><AdminVehicleForm /></AdminGuard>}
              />
              <Route
                path="/admin/precos"
                element={<AdminGuard><AdminPricing /></AdminGuard>}
              />
              <Route
                path="/admin/importar"
                element={<AdminGuard requiredRole="ADMIN"><AdminImport /></AdminGuard>}
              />
              <Route
                path="/admin/importacoes"
                element={<AdminGuard><AdminImportHistory /></AdminGuard>}
              />
              <Route
                path="/admin/logs"
                element={<AdminGuard><AdminLogs /></AdminGuard>}
              />
              <Route
                path="/admin/descontos"
                element={<AdminGuard requiredRole="ADMIN"><AdminDiscounts /></AdminGuard>}
              />

              {/* ── 404 ───────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
