"use client";

import React from "react";
import Layout from "@/components/Layout";
import SupabaseProductsCheck from "@/components/SupabaseProductsCheck";

const Index = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel inicial</h1>
          <p className="text-sm text-slate-500">Ferramentas rápidas para verificar o sistema.</p>
        </div>

        <SupabaseProductsCheck />
      </div>
    </Layout>
  );
};

export default Index;