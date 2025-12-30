
import React, { useState, useRef } from 'react';
import { Upload, ArrowRight, Check, X, FileText, Database } from 'lucide-react';
import { parseCSV } from '../services/csvHelper';

interface CSVImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (mappedData: any[]) => Promise<void>;
  fields: { key: string; label: string; required?: boolean }[];
  entityName: string;
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ isOpen, onClose, onImport, fields, entityName }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // System Field -> CSV Header
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      const data = await parseCSV(file);
      if (data.length > 0) {
        setCsvData(data);
        setCsvHeaders(Object.keys(data[0]));
        
        // Auto-map logic (simple fuzzy match)
        const initialMapping: Record<string, string> = {};
        fields.forEach(field => {
            const match = Object.keys(data[0]).find(h => 
                h.toLowerCase().replace(/_/g, '').includes(field.key.toLowerCase()) || 
                h.toLowerCase().includes(field.label.toLowerCase())
            );
            if (match) initialMapping[field.key] = match;
        });
        setMapping(initialMapping);
        setStep(2);
      }
    } catch (err) {
      alert("Erro ao ler arquivo CSV.");
    }
  };

  const handleImportSubmit = async () => {
    setIsImporting(true);
    try {
        const mappedData = csvData.map(row => {
            const newRow: any = {};
            fields.forEach(field => {
                const csvHeader = mapping[field.key];
                if (csvHeader) {
                    newRow[field.key] = row[csvHeader];
                }
            });
            return newRow;
        });
        await onImport(mappedData);
        onClose();
        setStep(1);
        setCsvData([]);
    } catch (e) {
        console.error(e);
        alert("Erro na importação.");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Importação em Massa - {entityName}</h3>
                <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1. Upload</span>
                    <span className="text-slate-300">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2. Mapeamento</span>
                    <span className="text-slate-300">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3. Revisão</span>
                </div>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            
            {/* STEP 1: UPLOAD */}
            {step === 1 && (
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-10">
                    <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 mb-4">
                        <Upload size={32}/>
                    </div>
                    <h4 className="text-lg font-medium text-slate-700 mb-2">Selecione seu arquivo CSV</h4>
                    <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
                        O arquivo deve conter cabeçalhos na primeira linha. Separadores comuns (vírgula, ponto e vírgula) são detectados automaticamente.
                    </p>
                    <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload}/>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
                    >
                        Escolher Arquivo
                    </button>
                </div>
            )}

            {/* STEP 2: MAPPING */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-700 flex items-start">
                        <Database className="mr-2 mt-0.5" size={16}/>
                        <div>
                            <span className="font-bold">Vincule as colunas:</span> Relacione os campos obrigatórios do sistema (esquerda) com as colunas encontradas no seu arquivo (direita).
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map(field => (
                            <div key={field.key} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-800">
                                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">{field.key}</span>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 mx-2"/>
                                <select 
                                    className="w-48 text-sm border-slate-300 rounded-md focus:ring-indigo-500"
                                    value={mapping[field.key] || ''}
                                    onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                                >
                                    <option value="">Ignorar</option>
                                    {csvHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 3: PREVIEW */}
            {step === 3 && (
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-800">Amostragem de Dados (Primeiros 5 registros)</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    {fields.filter(f => mapping[f.key]).map(f => (
                                        <th key={f.key} className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {csvData.slice(0, 5).map((row, idx) => (
                                    <tr key={idx}>
                                        {fields.filter(f => mapping[f.key]).map(f => (
                                            <td key={f.key} className="px-4 py-2 text-sm text-slate-700 whitespace-nowrap">
                                                {row[mapping[f.key]!] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-slate-500 text-center">Total de registros a importar: <span className="font-bold text-slate-900">{csvData.length}</span></p>
                </div>
            )}
        </div>

        {/* Footer */}
        {step > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
                <button onClick={() => setStep(prev => prev - 1 as any)} className="text-slate-600 font-medium px-4 py-2 hover:bg-slate-200 rounded-lg">Voltar</button>
                {step === 2 && (
                    <button onClick={() => setStep(3)} className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center">
                        Revisar <ArrowRight size={16} className="ml-2"/>
                    </button>
                )}
                {step === 3 && (
                    <button onClick={handleImportSubmit} disabled={isImporting} className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-emerald-700 flex items-center disabled:opacity-50">
                        {isImporting ? 'Importando...' : 'Confirmar Importação'} <Check size={16} className="ml-2"/>
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
