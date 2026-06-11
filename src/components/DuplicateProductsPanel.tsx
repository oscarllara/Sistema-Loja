"use client";

import React from "react";
import { AlertTriangle, Copy, Loader2, Trash2 } from "lucide-react";
import { Produto } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/utils/toast";

interface DuplicateProductsPanelProps {
  products: Produto[];
  onDeleteProduct: (id: number) => Promise<void>;
}

type DuplicateGroup = {
  key: string;
  type: "descricao" | "codigo_novo" | "codigo_antigo";
  items: Produto[];
};

const normalize = (value?: string | null) => (value || "").trim().toUpperCase();

const DuplicateProductsPanel = ({ products, onDeleteProduct }: DuplicateProductsPanelProps) => {
  const [isCleaning, setIsCleaning] = React.useState<string | null>(null);

  const duplicateGroups = React.useMemo(() => {
    const groups: DuplicateGroup[] = [];

    const buildGroups = (
      type: DuplicateGroup["type"],
      getKey: (product: Produto) => string
    ) => {
      const map = new Map<string, Produto[]>();

      products.forEach((product) => {
        const key = getKey(product);
        if (!key) return;
        const current = map.get(key) || [];
        current.push(product);
        map.set(key, current);
      });

      map.forEach((items, key) => {
        if (items.length > 1) {
          groups.push({
            key,
            type,
            items: [...items].sort((a, b) => a.cd_produto - b.cd_produto)
          });
        }
      });
    };

    buildGroups("descricao", (product) => normalize(product.nome));
    buildGroups("codigo_novo", (product) => normalize(product.id_manual));
    buildGroups("codigo_antigo", (product) => normalize(product.id_importado));

    return groups.sort((a, b) => a.key.localeCompare(b.key));
  }, [products]);

  const handleCleanGroup = async (group: DuplicateGroup) => {
    const keeper = group.items[0];
    const toDelete = group.items.slice(1);

    const confirmed = confirm(
      `Manter "${keeper.nome}" (ID ${keeper.cd_produto}) e excluir ${toDelete.length} duplicado(s)?`
    );

    if (!confirmed) return;

    setIsCleaning(`${group.type}-${group.key}`);

    try {
      for (const item of toDelete) {
        await onDeleteProduct(item.cd_produto);
      }
      showSuccess("Duplicados removidos com sucesso.");
    } catch {
      showError("Não foi possível remover os duplicados.");
    } finally {
      setIsCleaning(null);
    }
  };

  if (duplicateGroups.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Copy size={18} />
            Limpeza de duplicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Nenhum produto duplicado encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Limpeza de duplicados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {duplicateGroups.map((group) => {
          const groupId = `${group.type}-${group.key}`;
          const keeper = group.items[0];

          return (
            <div key={groupId} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {group.type === "descricao" && "Descrição duplicada"}
                    {group.type === "codigo_novo" && "Código novo duplicado"}
                    {group.type === "codigo_antigo" && "Código antigo duplicado"}
                  </p>
                  <p className="text-xs text-slate-500">{group.key}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCleanGroup(group)}
                  disabled={isCleaning === groupId}
                  className="gap-2"
                >
                  {isCleaning === groupId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Limpar grupo
                </Button>
              </div>

              <div className="space-y-2">
                {group.items.map((item, index) => (
                  <div
                    key={item.cd_produto}
                    className={`rounded-lg border p-3 text-sm ${
                      index === 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="font-bold text-slate-900">
                      {index === 0 ? "Manter" : "Excluir"} — {item.nome}
                    </p>
                    <p className="text-xs text-slate-500">
                      cd_produto: {item.cd_produto} | id_manual: {item.id_manual || "-"} | id_importado: {item.id_importado || "-"}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500">
                Regra usada: mantém o menor <strong>cd_produto</strong> e remove os demais do grupo.
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DuplicateProductsPanel;