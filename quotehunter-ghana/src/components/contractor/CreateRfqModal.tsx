import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Project, Material, MaterialCategory } from '../../types/index.ts';
import { GHANA_REGIONS, STANDARD_CONSTRUCTION_UNITS } from '../../constants/ghana.ts';
import { X, Plus, Trash2, MapPin, Calendar, Building2, Layers, Check } from 'lucide-react';

interface CreateRfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (rfqId: string) => void;
  initialProjectId?: string | null;
}

interface FormItem {
  materialId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  specification?: string;
  notes?: string;
}

export const CreateRfqModal: React.FC<CreateRfqModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialProjectId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState('Greater Accra');
  const [deadline, setDeadline] = useState('');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Line items
  const [items, setItems] = useState<FormItem[]>([
    { itemName: 'Ghacem Extra Cement 42.5R', quantity: 500, unit: 'Bag (50kg)', materialId: 'mat_cem_ghacem42', specification: 'GS 1118:2016 Grade 42.5R' },
    { itemName: 'High Tensile 12mm Rebar (12m)', quantity: 200, unit: 'Length (12m)', materialId: 'mat_stl_rebar12', specification: 'BS 4449 Grade 500B' },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInit = async () => {
      try {
        const [projRes, matRes, catRes] = await Promise.all([
          api.getProjects(),
          api.getMaterials(),
          api.getCategories(),
        ]);
        setProjects(projRes);
        setMaterials(matRes);
        setCategories(catRes);

        // Preselect project if provided or pick first
        const targetProj = initialProjectId
          ? projRes.find(p => p.id === initialProjectId) || projRes[0]
          : projRes[0];

        if (targetProj) {
          setSelectedProjectId(targetProj.id);
          setDeliveryLocation(targetProj.location);
          setDeliveryRegion(targetProj.region);
          setTitle(`Materials Request for ${targetProj.name}`);
        } else {
          setTitle('Materials Procurement Package');
        }

        // Default deadline 7 days from now
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDeadline(d.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Failed to load initial RFQ data:', err);
      }
    };
    fetchInit();
  }, [isOpen, initialProjectId]);

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find(x => x.id === projId);
    if (p) {
      setDeliveryLocation(p.location);
      setDeliveryRegion(p.region);
      setTitle(`Materials Request for ${p.name}`);
    }
  };

  const handleAddItem = (mat?: Material) => {
    if (mat) {
      setItems([
        ...items,
        {
          materialId: mat.id,
          itemName: mat.name,
          quantity: mat.unit.includes('Trip') ? 10 : 100,
          unit: mat.unit,
          specification: mat.standardSpec || '',
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          itemName: '',
          quantity: 1,
          unit: 'Piece',
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !title || !deliveryLocation || items.length === 0) {
      alert('Please fill in all required fields and at least 1 material item.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createRfq({
        projectId: selectedProjectId,
        title,
        deliveryLocation,
        deliveryRegion,
        deadline,
        requiredDeliveryDate,
        notes,
        items,
      });

      onClose();
      onCreated(res.id);
    } catch (err: any) {
      alert('Failed to create RFQ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentProjectObj = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-3xl w-full my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              New Material Request (RFQ)
            </h2>
            <div className="text-xs text-slate-500">
              Broadcast request to verified Ghanaian building material suppliers across all 16 regions
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Project & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Construction Project *
                </label>
                {currentProjectObj && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    {currentProjectObj.region}
                  </span>
                )}
              </div>
              <select
                value={selectedProjectId}
                onChange={e => handleProjectChange(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {projects.length === 0 ? (
                  <option value="">No projects registered yet</option>
                ) : (
                  projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.location} ({p.region})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Request Title / Work Package *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Substructure Rebar & Concrete Package"
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Delivery Location & All 16 Regions of Ghana */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Site Location *
              </label>
              <input
                type="text"
                required
                value={deliveryLocation}
                onChange={e => setDeliveryLocation(e.target.value)}
                placeholder="e.g. AU Village Road, Cantonments"
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghana Region (All 16 Regions) *
              </label>
              <select
                value={deliveryRegion}
                onChange={e => setDeliveryRegion(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {GHANA_REGIONS.map(reg => (
                  <option key={reg.name} value={reg.name}>
                    {reg.name} (Capital: {reg.capital})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Bidding Deadline *
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* REQUESTED MATERIALS & QUANTITIES SECTION — FULLY RESPONSIVE */}
          <div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-slate-50/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Requested Materials & Quantities
                </h3>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Specify quantities, engineering grades, and units for suppliers to bid accurately
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Material
              </button>
            </div>

            {/* Touch-Friendly Quick Select Catalog Strip */}
            <div className="mb-3.5">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Quick Select from Ghanaian Construction Catalog:
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {materials.slice(0, 8).map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => handleAddItem(m)}
                    className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 hover:border-amber-500 rounded text-slate-800 font-medium transition-colors shadow-2xs shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table Headers */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-3 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <div className="col-span-5">Material Description</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2">Unit</div>
              <div className="col-span-2">Specification / Grade</div>
              <div className="col-span-1 text-right">Delete</div>
            </div>

            {/* Responsive Items List */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {/* MOBILE & TABLET LAYOUT */}
                  <div className="space-y-2 md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Material Item #{idx + 1}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ghacem Extra 42.5R Cement"
                          value={item.itemName}
                          onChange={e => handleUpdateItem(idx, 'itemName', e.target.value)}
                          className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        aria-label="Remove item"
                        className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded mt-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded font-mono tabular-nums font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Unit
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Bag (50kg), Piece..."
                          value={item.unit}
                          onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                          className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded text-slate-700 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                        Specification / Engineering Grade
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BS 4449 Grade 500B / GS 1118:2016"
                        value={item.specification || ''}
                        onChange={e => handleUpdateItem(idx, 'specification', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded text-slate-600 text-[11px] focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* DESKTOP 12-COLUMN GRID */}
                  <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-3">
                    <div className="col-span-5">
                      <input
                        type="text"
                        required
                        placeholder="Material description (e.g. Ghacem 42.5R)"
                        value={item.itemName}
                        onChange={e => handleUpdateItem(idx, 'itemName', e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded font-mono tabular-nums text-center font-bold focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Unit (e.g. Bag 50kg)"
                        value={item.unit}
                        onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded text-slate-700 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Specification / Grade"
                        value={item.specification || ''}
                        onChange={e => handleUpdateItem(idx, 'specification', e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded text-slate-600 text-[11px] focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 ml-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Logistics Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Site Delivery Instructions & Access Conditions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Access road allows 20m³ tippers. Crane unloading required for steel rebar bundles."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Modal Footer Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 text-left">
              By submitting this RFQ, your organization accepts QuoteHunter&apos;s{' '}
              <span className="font-semibold text-slate-700">Terms of Service</span> and{' '}
              <span className="font-semibold text-slate-700">Data Governance Policy</span>.
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shadow-xs"
              >
                {submitting ? 'Broadcasting RFQ...' : 'Submit & Broadcast RFQ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
