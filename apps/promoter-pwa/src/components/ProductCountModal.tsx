import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Package, Layers, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProductCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSave: (productId: string, data: any) => Promise<void>;
  mode: 'GONDOLA' | 'INVENTORY' | 'BOTH'; // Context of where we are opening it from
}

export const ProductCountModal: React.FC<ProductCountModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  mode
}) => {
  const [gondolaCount, setGondolaCount] = useState<number | ''>('');
  const [inventoryCount, setInventoryCount] = useState<number | ''>('');
  const [ruptureReason, setRuptureReason] = useState('');
  const [isStockout, setIsStockout] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setGondolaCount(product.gondolaCount ?? '');
      setInventoryCount(product.inventoryCount ?? '');
      setRuptureReason(product.ruptureReason || '');
      setIsStockout(product.isStockout || false);
    }
  }, [product]);

  // Calculate total
  const g = typeof gondolaCount === 'number' ? gondolaCount : 0;
  const i = typeof inventoryCount === 'number' ? inventoryCount : 0;
  const total = g + i;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validation
      if (total === 0 && !ruptureReason && !isStockout) {
        // If total is 0, we require a reason or mark as stockout
        // But maybe the user just wants to save 0 for now?
        // User said: "se Estiver zerado.. o produto. abre uma ruptura e ele tem que descrever o motivo"
        // So we should probably prompt for reason if 0.
        toast.error('Se o estoque é 0, descreva o motivo da ruptura.');
        setSaving(false);
        return;
      }

      const payload = {
        gondolaCount: gondolaCount === '' ? 0 : gondolaCount,
        inventoryCount: inventoryCount === '' ? 0 : inventoryCount,
        ruptureReason: total === 0 ? ruptureReason : null, // Clear reason if stock > 0
        isStockout: total === 0,
        stockCount: total,
        checked: true // Mark as checked/counted
      };

      await onSave(product.productId, payload);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{product.product.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Total Display */}
          <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
            <span className="font-semibold text-blue-800">Total Contado:</span>
            <span className="text-2xl font-bold text-blue-600">{total}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gondola Input */}
            <div className={`space-y-2 ${(mode === 'INVENTORY' && !mode.includes('BOTH')) ? 'opacity-50' : ''}`}>
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Package size={16} className="mr-1" />
                Gôndola
              </label>
              <input
                type="number"
                value={gondolaCount}
                onChange={(e) => setGondolaCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border rounded-lg p-3 text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
                autoFocus={mode === 'GONDOLA'}
              />
            </div>

            {/* Inventory Input */}
            <div className={`space-y-2 ${(mode === 'GONDOLA' && !mode.includes('BOTH')) ? 'opacity-50' : ''}`}>
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Layers size={16} className="mr-1" />
                Estoque
              </label>
              <input
                type="number"
                value={inventoryCount}
                onChange={(e) => setInventoryCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border rounded-lg p-3 text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
                autoFocus={mode === 'INVENTORY'}
              />
            </div>
          </div>

          {/* Rupture Reason - Only if Total is 0 */}
          {total === 0 && (
            <div className="space-y-2 animate-fadeIn">
              <label className="flex items-center text-sm font-medium text-red-600">
                <AlertTriangle size={16} className="mr-1" />
                Motivo da Ruptura (Estoque Zerado)
              </label>
              <select
                value={ruptureReason}
                onChange={(e) => setRuptureReason(e.target.value)}
                className="w-full border border-red-200 rounded-lg p-3 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">Selecione um motivo...</option>
                <option value="Sem Estoque Virtual">Sem Estoque Virtual</option>
                <option value="Produto não encontrado">Produto não encontrado</option>
                <option value="Avaria">Avaria</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          )}

          {/* Product Info / EAN */}
          <div className="text-xs text-gray-500 flex items-center justify-center">
             <Info size={12} className="mr-1" />
             EAN: {product.product.ean || 'N/A'}
          </div>

        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border rounded-lg text-gray-600 font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
          >
            {saving ? 'Salvando...' : (
                <>
                    <Save size={18} className="mr-2" />
                    Salvar
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
