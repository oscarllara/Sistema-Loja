"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, X } from 'lucide-react';
import { db } from '@/services/api';

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: 'Venda' | 'Orcamento' | 'Fechamento';
}

const PrintPreview = ({ isOpen, onClose, data, type }: PrintPreviewProps) => {
  const config = db.config.get();
  const [copies, setCopies] = React.useState(1);
  const [viewMode, setViewMode] = React.useState<'Normal' | 'TXT'>('Normal');
  const [currentConfig, setCurrentConfig] = React.useState<any>(null);

  React.useEffect(() => {
    const load = async () => {
      const cfg = await db.config.get();
      setCurrentConfig(cfg);
    };
    load();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!data || !currentConfig) return null;

  const renderContent = () => {
    if (type === 'Fechamento') {
      return (
        <div className="space-y-4 text-[10px] font-mono">
          <div className="text-center border-b border-dashed pb-2">
            {currentConfig.logo_url && <img src={currentConfig.logo_url} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />}
            <h2 className="text-sm font-bold">FECHAMENTO DE CAIXA</h2>
            <p>DATA: {new Date(data.date).toLocaleDateString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>SALDO ANTERIOR:</span><span>R$ {data.saldoAnterior.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-emerald-600"><span>(+) ENTRADAS:</span><span>R$ {data.totalEntradas.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-rose-600"><span>(-) SAÍDAS:</span><span>R$ {data.totalSaidas.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-dashed pt-1 font-black"><span>(=) SALDO FINAL:</span><span>R$ {data.saldoFinal.toFixed(2)}</span></div>
          </div>
          {data.caixaSessao && (
            <div className="pt-2 border-t border-dashed space-y-1">
              <p className="font-bold mb-1">CONFERÊNCIA DO CAIXA:</p>
              <div className="flex justify-between"><span>ABERTURA PREVISTA:</span><span>R$ {Number(data.caixaSessao.saldo_previsto_abertura || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>ABERTURA REAL:</span><span>R$ {Number(data.caixaSessao.saldo_real_abertura || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>DIF. ABERTURA:</span><span>R$ {Number(data.caixaSessao.diferenca_abertura || 0).toFixed(2)}</span></div>
              {data.caixaSessao.status === 'Fechado' && (
                <>
                  <div className="flex justify-between"><span>FECHAMENTO REAL:</span><span>R$ {Number(data.caixaSessao.saldo_real_fechamento || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold"><span>DIF. FECHAMENTO:</span><span>R$ {Number(data.caixaSessao.diferenca_fechamento || 0).toFixed(2)}</span></div>
                </>
              )}
              {Number(data.diferencaAberturaSeguinte || 0) !== 0 && (
                <div className="flex justify-between font-bold text-rose-600"><span>DIF. ABERTURA SEGUINTE:</span><span>R$ {Number(data.diferencaAberturaSeguinte || 0).toFixed(2)}</span></div>
              )}
            </div>
          )}
          <div className="pt-2 border-t border-dashed">
            <p className="font-bold mb-1">RESUMO POR MEIO:</p>
            {Object.entries(data.resumoMeios).map(([meio, valor]: any) => (
              <div key={meio} className="flex justify-between">
                <span>{meio.toUpperCase()}:</span>
                <span>R$ {valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 text-center border-t border-dashed">
            <p>__________________________</p>
            <p>ASSINATURA DO RESPONSÁVEL</p>
          </div>
        </div>
      );
    }

    if (viewMode === 'TXT') {
      return (
        <pre className="font-mono text-[10px] whitespace-pre-wrap bg-slate-50 p-4 border">
          {`==========================================
          ${currentConfig.nome_empresa} - ${type.toUpperCase()} #${data.cd_venda || data.cd_orcamento}
==========================================
DATA: ${new Date(data.data).toLocaleString()}
CLIENTE: ${data.nome_cliente || 'CONSUMIDOR'}
------------------------------------------
ITEM        QTD    VLR UNIT    SUBTOTAL
${data.itens.map((i: any) => 
  `${i.nome_produto.padEnd(12).substring(0, 12)} ${i.qtde.toString().padStart(4)} ${i.valor.toFixed(2).padStart(10)} ${i.subtotal.toFixed(2).padStart(10)}`
).join('\n')}
------------------------------------------
TOTAL GERAL: R$ ${data.total.toFixed(2).padStart(10)}
==========================================
   ESTE DOCUMENTO NÃO É VALIDO COMO NF
==========================================`}
        </pre>
      );
    }

    return (
      <>
        <div className="text-center border-b pb-4 mb-4">
          {currentConfig.logo_url && <img src={currentConfig.logo_url} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />}
          <h1 className="text-xl font-black uppercase">{currentConfig.nome_empresa}</h1>
          <p className="text-[10px]">{currentConfig.slogan}</p>
          <p className="text-[10px]">{currentConfig.endereco}</p>
          <p className="text-[10px]">CNPJ: {currentConfig.cnpj} | Tel: {currentConfig.telefone}</p>
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
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle>{type} {data.cd_venda || data.cd_orcamento || ''}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              {type === 'Orcamento' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'Normal' ? 'TXT' : 'Normal')}
                  className="gap-2"
                >
                  <FileText size={16} /> {viewMode === 'Normal' ? 'Ver TXT' : 'Ver Normal'}
                </Button>
              )}
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
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X size={16} /> Voltar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-8 bg-slate-200 flex justify-center">
          <div
            id="printable-area"
            className="bg-white shadow-lg p-8"
            style={{
              width: currentConfig.tipo_impressao === 'Bobina' ? (currentConfig.largura_bobina === '79mm' ? '300px' : '340px') : '210mm',
              minHeight: 'auto',
              paddingLeft: `${currentConfig.margem_esquerda}mm`,
              paddingRight: `${currentConfig.margem_direita}mm`,
              paddingTop: `${currentConfig.margem_topo}mm`,
              paddingBottom: `${currentConfig.margem_rodape}mm`,
            }}
          >
            {renderContent()}
          </div>
        </div>

        <div className="border-t bg-white p-3 flex justify-end">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} /> Fechar e voltar
          </Button>
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