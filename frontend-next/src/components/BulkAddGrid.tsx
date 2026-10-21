import { useState } from 'react';
import { X, Check, PackagePlus, Plus } from 'lucide-react';

export function BulkAddGrid({ onClose, onSave, isSaving }: { onClose: () => void, onSave: (items: any[]) => void, isSaving: boolean }) {
  const [rows, setRows] = useState([
    { name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' },
    { name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' },
    { name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' },
    { name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' },
    { name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' },
  ]);

  const updateRow = (index: number, field: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    
    // Auto-add row if typing in the last row
    if (index === rows.length - 1 && value.trim() !== '') {
      newRows.push({ name: '', sku: '', unit: 'pcs', unit_price: '', gst_rate: '0' });
    }
    
    setRows(newRows);
  };

  const submit = () => {
    const validRows = rows.filter(r => r.name.trim() !== '' && r.unit_price.trim() !== '');
    if (validRows.length === 0) return alert('Enter at least one valid item with name and price.');
    onSave(validRows);
  };

  const inputClass = "w-full bg-transparent px-2 py-1.5 outline-none text-sm border-b border-transparent focus:border-primary transition-colors";

  return (
    <div className="mb-6 rounded-xl border border-secondary-foreground/30 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <PackagePlus className="text-secondary" size={20} />
          <h2 className="font-extrabold text-secondary-foreground">Quick Bulk Add</h2>
          <span className="ml-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Excel Mode</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X size={17} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1.5fr_1fr] gap-0 border-b border-border bg-muted/40 px-2 py-2 mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="px-2">Item Name *</div>
            <div className="px-2">SKU (Optional)</div>
            <div className="px-2">Unit *</div>
            <div className="px-2">Price (₹) *</div>
            <div className="px-2">GST %</div>
          </div>
          
          <div className="divide-y divide-border/50">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[2.5fr_1.5fr_1fr_1.5fr_1fr] gap-0 px-2 py-1 hover:bg-muted/10">
                <input 
                  autoFocus={i === 0}
                  className={inputClass} 
                  placeholder={i === 0 ? "e.g. Parle G 100g" : ""} 
                  value={row.name} 
                  onChange={e => updateRow(i, 'name', e.target.value)} 
                />
                <input 
                  className={inputClass} 
                  placeholder={i === 0 ? "PG-100" : ""} 
                  value={row.sku} 
                  onChange={e => updateRow(i, 'sku', e.target.value)} 
                />
                <input 
                  className={inputClass} 
                  value={row.unit} 
                  onChange={e => updateRow(i, 'unit', e.target.value)} 
                />
                <input 
                  className={inputClass} 
                  type="number"
                  placeholder={i === 0 ? "10" : ""} 
                  value={row.unit_price} 
                  onChange={e => updateRow(i, 'unit_price', e.target.value)} 
                />
                <input 
                  className={inputClass} 
                  type="number"
                  value={row.gst_rate} 
                  onChange={e => updateRow(i, 'gst_rate', e.target.value)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-4">
        <p className="text-xs text-muted-foreground">Press <kbd className="rounded border border-border bg-muted px-1">Tab</kbd> to move fields. Last row auto-creates a new one.</p>
        <button onClick={submit} disabled={isSaving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
          {isSaving ? "Saving..." : <><Check size={16} /> Save {rows.filter(r => r.name.trim() !== '' && r.unit_price.trim() !== '').length} items</>}
        </button>
      </div>
    </div>
  );
}

