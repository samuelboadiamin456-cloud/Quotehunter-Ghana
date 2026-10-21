import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { Project } from '../../types/index.ts';
import { GHANA_REGIONS } from '../../constants/ghana.ts';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, Download, ArrowRight, MapPin } from 'lucide-react';

interface BoqImportModalProps {
  isOpen: boolean;
  projects: Project[];
  onClose: () => void;
  onImportComplete: (rfqId: string) => void;
}

interface ParsedBoqItem {
  itemName: string;
  quantity: number;
  unit: string;
  specification: string;
  materialId: string | null;
  confidence: 'matched' | 'unmatched';
}

const SAMPLE_CSV = `Item Description,Quantity,Unit,Standard Specification
Ghacem Extra Cement 42.5R,500,Bag (50kg),GS 1118:2016 Grade 42.5R
High Tensile 12mm Rebar (12m),200,Length (12m),BS 4449 Grade 500B
High Tensile 16mm Rebar (12m),100,Length (12m),BS 4449 Grade 500B
Sharp River Sand,30,Trip (20m³),Clean Washed River Sand
Granite Chippings 3/4 inch,15,Trip (20m³),Crushed Granite Aggregate
Solid Concrete Block 6-inch,3000,Piece,Machine vibrated 4.5 N/mm²`;

export const BoqImportModal: React.FC<BoqImportModalProps> = ({
  isOpen,
  projects,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [csvRaw, setCsvRaw] = useState(SAMPLE_CSV);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [rfqTitle, setRfqTitle] = useState('Bill of Quantities Procurement Package');
  const [deliveryLocation, setDeliveryLocation] = useState(projects[0]?.location || 'Cantonments, Accra');
  const [deliveryRegion, setDeliveryRegion] = useState(projects[0]?.region || 'Greater Accra');
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  
  const [parsedItems, setParsedItems] = useState<ParsedBoqItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a valid .csv spreadsheet file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvRaw(content);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleParseCsv = async () => {
    try {
      setParsing(true);
      setError(null);
      const res = await api.parseBoqCsv(csvRaw);
      setParsedItems(res.items);
      setStep('preview');
    } catch (err: any) {
      setError('CSV Parsing Error: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ParsedBoqItem, value: any) => {
    const updated = [...parsedItems];
    updated[index] = { ...updated[index], [field]: value };
    setParsedItems(updated);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_ghana_boq_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    if (!selectedProjectId || !rfqTitle || parsedItems.length === 0) {
      setError('Project, title, and valid items are required.');
      return;
    }

    try {
      setImporting(true);
      const res = await api.createRfq({
        projectId: selectedProjectId,
        title: rfqTitle,
        deliveryLocation,
        deliveryRegion,
        deadline,
        items: parsedItems.map(p => ({
          itemName: p.itemName,
          quantity: p.quantity,
          unit: p.unit,
          specification: p.specification,
          materialId: p.materialId,
        })),
      });

      onClose();
      onImportComplete(res.id);
    } catch (err: any) {
      setError('Failed to create RFQ from BOQ: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-3xl w-full my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Import Bill of Quantities (BOQ)
              </h2>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Automated mapping against standard Ghanaian building materials catalog
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload & Text Review */}
        {step === 'upload' && (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                {error}
              </div>
            )}

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-amber-500 transition-colors bg-slate-50/50">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-700">
                Upload CSV File from Quantity Surveyor / Estimator
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Expected columns: Item Description, Quantity, Unit, Standard Specification
              </div>
              <label className="mt-3 inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 shadow-2xs">
                Select CSV File
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Or Paste / Edit CSV Data Below:
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Ghana BOQ Template
                </button>
              </div>
              <textarea
                rows={6}
                value={csvRaw}
                onChange={e => setCsvRaw(e.target.value)}
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 bg-slate-50"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleParseCsv}
                disabled={parsing || !csvRaw.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                {parsing ? 'Parsing...' : 'Validate & Inspect Mapping'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Interactive Mapping & Correction Preview */}
        {step === 'preview' && (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Verified BOQ Line Items ({parsedItems.length} items parsed)
              </h3>
              <span className="text-[11px] text-slate-500">
                Review quantities and catalog associations before generating the RFQ
              </span>
            </div>

            {/* Target Project & All 16 Regions Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Target Project *</label>
                <select
                  value={selectedProjectId}
                  onChange={e => {
                    setSelectedProjectId(e.target.value);
                    const p = projects.find(x => x.id === e.target.value);
                    if (p) {
                      setDeliveryLocation(p.location);
                      setDeliveryRegion(p.region);
                    }
                  }}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">RFQ Package Name</label>
                <input
                  type="text"
                  value={rfqTitle}
                  onChange={e => setRfqTitle(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Site Location *</label>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={e => setDeliveryLocation(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghana Region *</label>
                <select
                  value={deliveryRegion}
                  onChange={e => setDeliveryRegion(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs"
                >
                  {GHANA_REGIONS.map(reg => (
                    <option key={reg.name} value={reg.name}>{reg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>

            {/* Responsive Parsed Items Cards / Table */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {parsedItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-semibold text-slate-900"
                    />
                    {item.confidence === 'matched' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Matched
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        Custom
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-mono tabular-nums text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-slate-700"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Specification</label>
                      <input
                        type="text"
                        value={item.specification}
                        onChange={e => handleItemChange(idx, 'specification', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-slate-500 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Back to Upload
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parsedItems.length === 0}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shadow-xs"
              >
                {importing ? 'Creating Procurement Package...' : 'Confirm & Generate RFQ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
