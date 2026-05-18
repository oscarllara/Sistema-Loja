import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { db } from "./services/api";
import Index from "./pages/Index";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Registrations from "./pages/Registrations";
import Financial from "./pages/Financial";
import DailyCash from "./pages/DailyCash";
import Purchases from "./pages/Purchases";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Rentals from "./pages/Rentals";
import ImportData from "./pages/ImportData";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const user = db.auth.getUser();
  if (!user) return <Navigate to="/login" replace />;
  
  if (permission && user.permissoes && !(user.permissoes as any)[permission]) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute permission="pos"><POS /></ProtectedRoute>} />
          <Route path="/rentals" element={<ProtectedRoute permission="rentals"><Rentals /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute permission="inventory"><Inventory /></ProtectedRoute>} />
          <Route path="/registrations" element={<ProtectedRoute permission="registrations"><Registrations /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute permission="financial"><Financial /></ProtectedRoute>} />
          <Route path="/daily-cash" element={<ProtectedRoute permission="financial"><DailyCash /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute permission="purchases"><Purchases /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permission="reports"><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute permission="settings"><ImportData /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;