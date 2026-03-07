import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Package, Layers, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BreakageReportModal } from './BreakageReportModal';

interface ProductCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSave: (productId: string, data: any) => Promise<void>;
  mode: 'GONDOLA' | 'INVENTORY' | 'BOTH'; // Context of where we are opening it from
  readOnly?: boolean;
  requireStockCount?: boolean;
  routeItemId?: string;
  supermarketId?: string;
}

export const ProductCountModal: React.FC<ProductCountModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  mode,
  readOnly = false,
  requireStockCount = true,
  routeItemId,
  supermarketId
}) => {
  const [gondolaCount, setGondolaCount] = useState<number | ''>('');
  const [inventoryCount, setInventoryCount] = useState<number | ''>('');
  const [ruptureReason, setRuptureReason] = useState('');
  const [isStockout, setIsStockout] = useState(false);
  const [saving, setSaving] = useState(false);

  const [validityDate, setValidityDate] = useState('');
  const [validityQuantity, setValidityQuantity] = useState<number | ''>('');
  const [isBreakageModalOpen, setIsBreakageModalOpen] = useState(false);

  const isValidityChecklistItem = (item: any) => {
    const desc = (item?.description || '').toLowerCase();
    if (item?.type === 'VALIDITY_CHECK') return true;
    if (desc.includes('vencimento') || desc.includes('venci') || desc.includes('validade')) return true;
    return false;
  };

  useEffect(() => {
    if (product) {
      setGondolaCount(product.gondolaCount ?? '');
      setInventoryCount(product.inventoryCount ?? '');
      setRuptureReason(product.ruptureReason || '');
      setIsStockout(product.isStockout || false);
      setValidityDate(product.validityDate || '');
      setValidityQuantity(
        product.validityQuantity !== null && product.validityQuantity !== undefined
          ? product.validityQuantity
          : ''
      );
    }
  }, [product]);

  // Calculate total
  const g = typeof gondolaCount === 'number' ? gondolaCount : 0;
  const i = typeof inventoryCount === 'number' ? inventoryCount : 0;
  const total = g + i;

  const handleSave = async () => {
    setSaving(true);
    try {
      const hasValidityChecklist =
        Array.isArray(product.checklists) &&
        product.checklists.some((c: any) => isValidityChecklistItem(c));

      if (hasValidityChecklist) {
        if (!validityDate) {
          toast.error('Informe a data de validade.');
          setSaving(false);
          return;
        }
        if (!validityQuantity || validityQuantity <= 0) {
          toast.error('Informe a quantidade de itens com esta validade.');
          setSaving(false);
          return;
        }
      }

      // Validation
      if (requireStockCount && total === 0 && !ruptureReason && !isStockout) {
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
        ruptureReason: (requireStockCount && total === 0) ? ruptureReason : null, // Clear reason if stock > 0
        isStockout: requireStockCount && total === 0,
        stockCount: total,
        validityDate: validityDate || null,
        validityQuantity: validityQuantity === '' ? null : validityQuantity,
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
          {!readOnly && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsBreakageModalOpen(true)}
                className="text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <AlertTriangle size={16} />
                Reportar Avaria
              </button>
            </div>
          )}
          
          {/* Total Display - Only if stock count required */}
          {requireStockCount && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-blue-800">Total Contado:</span>
              <span className="text-2xl font-bold text-blue-600">{total}</span>
            </div>
          )}

          {!requireStockCount && (
             <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-green-800 text-sm flex items-center gap-2">
                <Info size={16} />
                <span>Contagem de estoque não obrigatória para este item.</span>
             </div>
          )}

          {requireStockCount && (
          <div className="grid grid-cols-2 gap-4">
            {/* Gondola Input */}
            <div className={`space-y-2 ${(mode === 'INVENTORY' && !mode.includes('BOTH')) ? 'opacity-50' : ''}`}>
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Package size={16} className="mr-1" />
                Loja
              </label>
              <input
                type="number"
                value={gondolaCount}
                onChange={(e) => setGondolaCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border rounded-lg p-3 text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="0"
                autoFocus={mode === 'GONDOLA' && !readOnly}
                disabled={readOnly}
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
                className="w-full border rounded-lg p-3 text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="0"
                autoFocus={mode === 'INVENTORY' && !readOnly}
                disabled={readOnly}
              />
            </div>
          </div>
          )}

          {/* Validity Fields (if there is a validity-related checklist) */}
          {Array.isArray(product.checklists) &&
           product.checklists.some((c: any) => isValidityChecklistItem(c)) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Quantidade de itens com esta validade
                </label>
                <input
                  type="number"
                  min={0}
                  value={validityQuantity}
                  onChange={(e) =>
                    setValidityQuantity(
                      e.target.value === '' ? '' : parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* Rupture Reason - Only if Total is 0 */}
          {requireStockCount && total === 0 && (
            <div className="space-y-2 animate-fadeIn">
              <label className="flex items-center text-sm font-medium text-red-600">
                <AlertTriangle size={16} className="mr-1" />
                Motivo da Ruptura
              </label>
              <textarea
                value={ruptureReason}
                onChange={(e) => setRuptureReason(e.target.value)}
                className="w-full border border-red-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-red-50 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-500"
                placeholder="Descreva o motivo..."
                rows={3}
                disabled={readOnly}
              />
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
            {readOnly ? 'Fechar' : 'Cancelar'}
          </button>
          {!readOnly && (
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
          )}
        </div>
      </div>

      <BreakageReportModal
        isOpen={isBreakageModalOpen}
        onClose={() => setIsBreakageModalOpen(false)}
        product={product}
        routeItemId={routeItemId || ''}
        supermarketId={supermarketId || ''}
      />
    </div>
  );
};
