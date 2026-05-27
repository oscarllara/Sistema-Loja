"use client";

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { db } from '@/services/api';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

const SyncStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const checkOffline = React.useCallback(() => {
    setOfflineCount(db.vendas.getOfflineCount());
  }, []);

  const handleSync = React.useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const count = db.vendas.getOfflineCount();
    if (count === 0) return;

    setIsSyncing(true);
    try {
      const synced = await db.vendas.syncOffline();
      if (synced > 0) {
        showSuccess(`${synced} vendas sincronizadas com a nuvem!`);
      }
      checkOffline();
    } catch (err) {
      console.error("Erro na sincronização automática");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkOffline]);

  React.useEffect(() => {
    const handleOnline = () => { setIsOnline(true); handleSync(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      checkOffline();
      if (navigator.onLine) handleSync();
    }, 10000); // Verifica a cada 10 segundos

    checkOffline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [handleSync, checkOffline]);

  if (offlineCount === 0 && isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Sincronizado
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
      !isOnline ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"
    )}>
      {!isOnline ? <WifiOff size={12} /> : (isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />)}
      <span>
        {!isOnline ? "Modo Offline" : (isSyncing ? "Sincronizando..." : "Conectado")}
        {offlineCount > 0 && ` (${offlineCount} pendentes)`}
      </span>
      {offlineCount > 0 && isOnline && !isSyncing && (
        <button onClick={handleSync} className="ml-1 underline hover:text-amber-900">Sincronizar agora</button>
      )}
    </div>
  );
};

export default SyncStatus;