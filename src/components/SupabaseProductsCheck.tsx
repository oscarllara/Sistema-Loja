"use client";

import React from "react";
import { Loader2, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

type CheckResult = {
  totalProducts?: number;
  latestProduct?: {
    cd_produto?: number;
    id_manual?: string | null;
    id_importado?: string | null;
    nome?: string | null;
  } | null;
  insertTest?: {
    success: boolean;
    error?: string;
    insertedRow?: {
      cd_produto?: number;
      id_manual?: string | null;
      id_importado?: string | null;
      nome?: string | null;
    } | null;
  };
};

const SupabaseProductsCheck = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<CheckResult | null>(null);

  const runCheck = async () => {
    setIsLoading(true);

    const checkResult: CheckResult = {};

    try {
      const { data: listData, error: listError } = await supabase
        .from("produtos")
        .select("cd_produto, id_manual, id_importado, nome")
        .order("cd_produto", { ascending: false })
        .limit(5);

      if (listError) {
        throw new Error(`Falha ao ler produtos: ${listError.message}`);
      }

      checkResult.totalProducts = listData?.length ?? 0;
      checkResult.latestProduct = listData?.[0] ?? null;

      let maxManualId = 0;
      let maxImportedId = 0;

      (listData || []).forEach((item) => {
        const manualNum = parseInt(item.id_manual || "0", 10);
        if (!isNaN(manualNum) && manualNum > maxManualId) maxManualId = manualNum;

        const importedNum = parseInt(item.id_importado || "0", 10);
        if (!isNaN(importedNum) && importedNum > maxImportedId) maxImportedId = importedNum;
      });

      const nextManualId = String(maxManualId + 1).padStart(5, "0");
      const nextImportedId = String(maxImportedId + 1);
      const testName = `TESTE DYAD ${Date.now()}`;

      const { data: insertedData, error: insertError } = await supabase
        .from("produtos")
        .insert([
          {
            id_manual: nextManualId,
            id_importado: nextImportedId,
            nome: testName,
            un: "UN",
            compra: 1,
            venda: 2,
            venda_vista: 2,
            venda_fracionada: 0,
            desconto_vista_valor: 0,
            estoque: 0,
            minimo: 0,
            fracionado: false,
            is_kit: false,
            is_locacao: false,
            disponivel_site: false,
            integrar_calculadora: false,
            data_atualizacao: new Date().toISOString()
          }
        ])
        .select("cd_produto, id_manual, id_importado, nome")
        .single();

      if (insertError) {
        console.error("Erro Real do Supabase:", insertError);
        checkResult.insertTest = {
          success: false,
          error: insertError.message
        };
        setResult(checkResult);
        showError("A checagem encontrou erro no insert.");
        return;
      }

      checkResult.insertTest = {
        success: true,
        insertedRow: insertedData
      };

      setResult(checkResult);
      showSuccess("Checagem concluída com sucesso.");
    } catch (error: any) {
      console.error("Erro Real do Supabase:", error);
      setResult({
        insertTest: {
          success: false,
          error: error?.message || "Erro desconhecido"
        }
      });
      showError(error?.message || "Falha ao checar a tabela produtos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database size={18} />
          Checagem objetiva do Supabase / produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runCheck} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
          Rodar checagem
        </Button>

        {result && (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p><strong>Produtos lidos:</strong> {result.totalProducts ?? "-"}</p>
              <p><strong>Último produto:</strong> {result.latestProduct?.nome || "-"}</p>
              <p><strong>Último cd_produto:</strong> {result.latestProduct?.cd_produto ?? "-"}</p>
              <p><strong>Último id_manual:</strong> {result.latestProduct?.id_manual || "-"}</p>
              <p><strong>Último id_importado:</strong> {result.latestProduct?.id_importado || "-"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                {result.insertTest?.success ? (
                  <CheckCircle2 className="text-emerald-600" size={18} />
                ) : (
                  <AlertTriangle className="text-rose-600" size={18} />
                )}
                <strong>Teste de insert</strong>
              </div>

              {result.insertTest?.success ? (
                <div className="space-y-1">
                  <p><strong>Status:</strong> OK</p>
                  <p><strong>cd_produto retornado:</strong> {result.insertTest.insertedRow?.cd_produto ?? "-"}</p>
                  <p><strong>id_manual retornado:</strong> {result.insertTest.insertedRow?.id_manual || "-"}</p>
                  <p><strong>id_importado retornado:</strong> {result.insertTest.insertedRow?.id_importado || "-"}</p>
                  <p><strong>nome retornado:</strong> {result.insertTest.insertedRow?.nome || "-"}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p><strong>Status:</strong> FALHOU</p>
                  <p className="text-rose-600 break-words"><strong>Erro:</strong> {result.insertTest?.error || "-"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseProductsCheck;