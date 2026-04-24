"use client";

import React from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

const PurchaseForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [items, setItems] = React.useState<any[]>([]);
  const [nf, setNf] = React.useState("");
  const [supplierId, setSupplierId] = React.useState(1);
  
  const products = db.produtos.getAll();

  const addItem = () => {
    setItems([...items, { cd_produto: products[0]?.cd_produto, qtde: 1, valor_unit: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const total = items.reduce((acc, item) => acc + (item.qtde * item.valor_unit), 0);

  const handleSave = () => {
    if (items.length === 0) {
      showError("Adicione pelo menos um item.");
      return;
    }

    const novaCompra = {
      cd_compra: Date.now(),
      data: new Date().toISOString(),
      nota_fiscal: nf,
      total: total,
      cd_fornecedores: supplierId,
      cd_func: 1,
      confirmada: true
    };

    db.compras.create(novaCompra, items);
    showSuccess("Compra registrada! Estoque atualizado e conta a pagar gerada.");
    onSuccess();
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded-xl border border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número da NF</Label>
          <Input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Ex: 123456" />
        </div>
        <div className="space-y-2">
          <Label>Fornecedor (ID)</Label>
          <Input type="number" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Itens da Compra</h3>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
            <Plus size={16} /> Adicionar Item
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px]">Produto</Label>
              <select 
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={item.cd_produto}
                onChange={(e) => updateItem(index, 'cd_produto', Number(e.target.value))}
              >
                {products.map(p => (
                  <option key={p.cd_produto} value={p.cd_produto}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-[10px]">Qtde</Label>
              <Input 
                type="number" 
                value={item.qtde} 
                onChange={(e) => updateItem(index, 'qtde', Number(e.target.value))} 
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-[10px]">Vlr. Unit</Label>
              <Input 
                type="number" 
                value={item.valor_unit} 
                onChange={(e) => updateItem(index, 'valor_unit', Number(e.target.value))} 
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-rose-500">
              <Trash2 size={18} />
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t flex items-center justify-between">
        <div className="text-lg font-bold text-slate-900">
          Total: <span className="text-indigo-600">R$ {total.toFixed(2)}</span>
        </div>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Save size={18} /> Salvar Compra
        </Button>
      </div>
    </div>
  );
};

export default PurchaseForm;