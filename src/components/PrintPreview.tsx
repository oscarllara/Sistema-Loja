"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from 'lucide-react';
import { db } from '@/services/api';

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: 'Venda' | 'Orcamento';
}

const PrintPreview = ({ isOpen, onClose, data, type }: PrintPreviewProps) => {
  const config = db.config.get();
  const [copies, setCopies] = React.useState(1);

  const handlePrint = () => {
    window.print();
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <DialogTitle>{type} #{data.cd_venda || data.cd_orcamento}</DialogTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Vias:</span>
                <input 
                  type="number" 
                  value={copies} 
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="w-12 h-8 border rounded text-center text-sm"
                  min="1"
                />
              </div>
              <Button onClick={handlePrint} className="bg-indigo-600 gap-2">
                <Printer size={18} /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-8 bg-slate-200 flex justify-center">
          {/* Área de Impressão */}
          <div 
            id="printable-area"
            className="bg-white shadow-lg p-8"
            style={{
              width: config.tipo_impressao === 'Bobina' ? (config.largura_bobina === '79mm' ? '300px' : '340px') : '210mm',
              minHeight: '297mm',
              paddingLeft: `${config.margem_esquerda}mm`,
              paddingRight: `${config.margem_direita}mm`,
              paddingTop: `${config.margem_topo}mm`,
              paddingBottom: `${config.margem_rodape}mm`,
            }}
          >
            <div className="text-center border-b pb-4 mb-4">
              <h1 className="text-xl font-black uppercase">DyadERP - Sistema de Loja</h1>
              <p className="text-[10px]">Rua Exemplo, 123 - Centro - Cidade/UF</p>
              <p className="text-[10px]">CNPJ: 00.000.000/0001-00 | Tel: (00) 0000-0000</p>
            </div>

            <div className="flex justify-between text-[10px] font-bold mb-4">
              <span>{type.toUpperCase()}: {data.cd_venda || data.cd_orcamento}</span>
              <span>DATA: {new Date(data.data).toLocaleString()}</span>
            </div>

            <div className="border-b border-dashed mb-4">
              <p className="text-[10px] font-bold">CLIENTE: {data.nome_cliente || 'CONSUMIDOR FINAL'}</p>
            </div>

            <table className="w-full text-[10px] mb-4">
              <thead>
                <tr className="border-b border-dashed">
                  <th className="text-left py-1">ITEM</th>
                  <th className="text-right py-1">QTD</th>
                  <th className="text-right py-1">VLR</th>
                  <th className="text-right py-1">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {data.itens.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-1 uppercase">{item.nome_produto}</td>
                    <td className="text-right py-1">{item.qtde}</td>
                    <td className="text-right py-1">{item.valor.toFixed(2)}</td>
                    <td className="text-right py-1 font-bold">{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed pt-2 space-y-1">
              <div className="flex justify-between text-xs font-black">
                <span>TOTAL GERAL</span>
                <span>R$ {data.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>FORMA PAGTO:</span>
                <span className="font-bold">{data.meio_pagamento}</span>
              </div>
            </div>

            <div className="mt-8 text-center border-t pt-4">
              <p className="text-[9px] italic">Obrigado pela preferência!</p>
              <p className="text-[8px] text-slate-400 mt-2">Sistema DyadERP - www.dyad.sh</p>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100% !important; 
              box-shadow: none !important;
              padding: 0 !important;
            }
            @page {
              margin: 0;
              size: auto;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreview;