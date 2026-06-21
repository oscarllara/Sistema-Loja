import React from "react";
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
import PurchaseQuotes from "./pages/PurchaseQuotes";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Rentals from "./pages/Rentals";
import ImportData from "./pages/ImportData";
import Calculator from "./pages/Calculator";
import MobileApp from "./pages/MobileApp";
import FleetManagement from "./pages/FleetManagement";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, permission, sessionAccessKey }: { children: React.ReactNode, permission?: string, sessionAccessKey?: string }) => {
  const user = db.auth.getUser();
  if (!user) return <Navigate to="/login" replace />;

  const temporaryAccessUntil = sessionAccessKey ? Number(sessionStorage.getItem(sessionAccessKey) || 0) : 0;
  const hasTemporaryAccess = temporaryAccessUntil > Date.now();
  
  if (permission && user.permissoes && !(user.permissoes as any)[permission] && !hasTemporaryAccess) {
    return <Navigate to="/pos" replace />;
  }
  
  return <>{children}</>;
};

const RootRedirect = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('mobile.') || hostname.includes('moble.')) {
    return <Navigate to="/mobile" replace />;
  }
  return <Navigate to="/pos" replace />;
};

const App = () => {
  React.useEffect(() => {
    db.config.get().then(config => {
      let faviconUrl = config?.logo_url;
      
      if (!faviconUrl) {
        faviconUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
      }

      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }).catch(() => {
      const fallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = fallback;
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<RootRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute permission="pos"><POS /></ProtectedRoute>} />
            <Route path="/rentals" element={<ProtectedRoute permission="rentals"><Rentals /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute permission="inventory"><Inventory /></ProtectedRoute>} />
          <Route path="/registrations" element={<ProtectedRoute permission="registrations"><Registrations /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute permission="financial"><Financial /></ProtectedRoute>} />
          <Route path="/daily-cash" element={<ProtectedRoute permission="financial" sessionAccessKey="dyaderp_daily_cash_access"><DailyCash /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute permission="purchases"><Purchases /></ProtectedRoute>} />
          <Route path="/purchase-quotes" element={<ProtectedRoute permission="purchases"><PurchaseQuotes /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permission="reports"><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute permission="settings"><ImportData /></ProtectedRoute>} />
          <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
          <Route path="/mobile" element={<ProtectedRoute><MobileApp /></ProtectedRoute>} />
          <Route path="/fleet" element={<ProtectedRoute permission="reports"><FleetManagement /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;