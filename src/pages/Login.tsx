"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Lock, User, Loader2, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const [usuario, setUsuario] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [whatsapp, setWhatsapp] = React.useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await db.config.get();
        if (config?.whatsapp_suporte) {
          setWhatsapp(config.whatsapp_suporte.replace(/\D/g, ''));
        }
      } catch (e) {
        console.error("Erro ao carregar config de suporte");
      }
    };
    loadConfig();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = await db.auth.login(usuario, senha);
      if (user) {
        showSuccess(`Bem-vindo, ${user.nome}!`);
        navigate("/");
      } else {
        showError("Usuário ou senha incorretos.");
      }
    } catch (error) {
      showError("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupportClick = () => {
    if (whatsapp) {
      const message = encodeURIComponent("Olá! Esqueci minha senha de acesso ao Key Of Innov ERP e gostaria de solicitar uma nova.");
      window.open(`https://wa.me/${whatsapp}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <ShoppingCart size={32} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Key Of Innov ERP</CardTitle>
          <p className="text-slate-500 text-sm">Entre com suas credenciais para acessar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Usuário" 
                  className="pl-10 h-12 rounded-xl"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Senha" 
                  className="pl-10 pr-10 h-12 rounded-xl"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Acessar Sistema"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            {whatsapp ? (
              <button 
                onClick={handleSupportClick}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <MessageCircle size={14} className="text-emerald-500" />
                Esqueceu sua senha? <span className="font-bold underline">Falar com suporte</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400">Esqueceu sua senha? Contate o administrador.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;