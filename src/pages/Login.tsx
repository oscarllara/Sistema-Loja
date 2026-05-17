"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Lock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const [usuario, setUsuario] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.auth.login(usuario, senha);
    if (user) {
      showSuccess(`Bem-vindo, ${user.nome}!`);
      navigate("/");
    } else {
      showError("Usuário ou senha incorretos.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <ShoppingCart size={32} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">DyadERP</CardTitle>
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
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  type="password" 
                  placeholder="Senha" 
                  className="pl-10 h-12 rounded-xl"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100">
              Acessar Sistema
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">Esqueceu sua senha? Contate o administrador.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;