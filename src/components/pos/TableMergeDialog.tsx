import React, { useState, useMemo } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { Merge, ArrowRight, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TableMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TableMergeDialog: React.FC<TableMergeDialogProps> = ({ open, onOpenChange }) => {
  const { tables, orders, updateTableStatus } = usePOS();
  const { t } = useLocale();
  const [sourceTableId, setSourceTableId] = useState<string | null>(null);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Only occupied tables can be merged
  const occupiedTables = useMemo(() => 
    tables.filter(t => t.status === 'occupied'), 
    [tables]
  );

  const getTableOrder = (tableNumber: number) => {
    return orders.find(o =>
      o.tableNumber === tableNumber &&
      !o.isDirectBill &&
      (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    );
  };

  const sourceTable = tables.find(t => t.id === sourceTableId);
  const targetTable = tables.find(t => t.id === targetTableId);
  const sourceOrder = sourceTable ? getTableOrder(sourceTable.number) : null;
  const targetOrder = targetTable ? getTableOrder(targetTable.number) : null;

  const canMerge = sourceTableId && targetTableId && sourceTableId !== targetTableId && sourceOrder;

  const handleMerge = async () => {
    if (!sourceTable || !targetTable || !sourceOrder) return;

    setMerging(true);
    try {
      // Get current orders from storage
      const { getOrders, setOrders } = await import('@/lib/store');
      const allOrders = getOrders();

      if (targetOrder) {
        // Merge items into target order
        const mergedItems = [...targetOrder.items];
        
        for (const srcItem of sourceOrder.items) {
          const existingIdx = mergedItems.findIndex(
            i => i.id === srcItem.id && i.notes === srcItem.notes
          );
          if (existingIdx >= 0) {
            mergedItems[existingIdx] = {
              ...mergedItems[existingIdx],
              quantity: mergedItems[existingIdx].quantity + srcItem.quantity,
            };
          } else {
            mergedItems.push({ ...srcItem });
          }
        }

        const newSubtotal = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const newTax = targetOrder.tax; // Keep target tax rate logic
        const newTotal = newSubtotal + newTax - (targetOrder.discount || 0);

        const updatedOrders = allOrders
          .filter(o => o.id !== sourceOrder.id) // Remove source order
          .map(o =>
            o.id === targetOrder.id
              ? { ...o, items: mergedItems, subtotal: newSubtotal, total: newTotal }
              : o
          );

        setOrders(updatedOrders);
      } else {
        // No target order - move source order to target table
        const updatedOrders = allOrders.map(o =>
          o.id === sourceOrder.id
            ? { ...o, tableNumber: targetTable.number }
            : o
        );
        setOrders(updatedOrders);
      }

      // Update table statuses
      updateTableStatus(sourceTable.id, 'available');
      // Target stays occupied

      // Audit log entry in localStorage
      const auditLog = JSON.parse(localStorage.getItem('pos_merge_audit_log') || '[]');
      auditLog.push({
        id: crypto.randomUUID(),
        sourceTable: sourceTable.number,
        targetTable: targetTable.number,
        sourceOrderId: sourceOrder.id,
        targetOrderId: targetOrder?.id || null,
        itemsMerged: sourceOrder.items.length,
        mergedAt: new Date().toISOString(),
        mergedBy: localStorage.getItem('pos_staff_name') || 'Staff',
      });
      localStorage.setItem('pos_merge_audit_log', JSON.stringify(auditLog));

      toast.success(`Table ${sourceTable.number} merged into Table ${targetTable.number}`);
      
      // Force re-read orders
      const { getOrders: refreshOrders } = await import('@/lib/store');
      // Trigger a page-level state refresh by closing and resetting
      onOpenChange(false);
      setSourceTableId(null);
      setTargetTableId(null);

      // Reload orders into context
      window.dispatchEvent(new Event('pos-orders-updated'));
    } catch (err) {
      console.error('Merge failed:', err);
      toast.error('Failed to merge tables');
    } finally {
      setMerging(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSourceTableId(null);
    setTargetTableId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-primary" />
            Merge Tables
          </DialogTitle>
          <DialogDescription>
            Select the source table (to move from) and target table (to move to). Items will be merged into the target table's order.
          </DialogDescription>
        </DialogHeader>

        {occupiedTables.length < 2 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <AlertTriangle className="w-10 h-10" />
            <p className="text-sm text-center">At least 2 occupied tables are needed to merge.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Source Table Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Source Table (move from)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {occupiedTables.map(table => {
                  const order = getTableOrder(table.number);
                  return (
                    <button
                      key={table.id}
                      disabled={table.id === targetTableId || !order}
                      onClick={() => setSourceTableId(table.id === sourceTableId ? null : table.id)}
                      className={cn(
                        'rounded-xl border-2 p-3 text-center transition-all',
                        sourceTableId === table.id
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/50',
                        (table.id === targetTableId || !order) && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="text-lg font-bold">T{table.number}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        {table.capacity}
                      </div>
                      {order && (
                        <div className="text-[10px] text-primary font-medium mt-1">
                          {order.items.length} items
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arrow */}
            {sourceTableId && (
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-primary animate-pulse" />
              </div>
            )}

            {/* Target Table Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Target Table (move to)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {occupiedTables.map(table => (
                  <button
                    key={table.id}
                    disabled={table.id === sourceTableId}
                    onClick={() => setTargetTableId(table.id === targetTableId ? null : table.id)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center transition-all',
                      targetTableId === table.id
                        ? 'border-success bg-success/10 ring-2 ring-success/30'
                        : 'border-border hover:border-success/50',
                      table.id === sourceTableId && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="text-lg font-bold">T{table.number}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      {table.capacity}
                    </div>
                    {getTableOrder(table.number) && (
                      <div className="text-[10px] text-success font-medium mt-1">
                        {getTableOrder(table.number)!.items.length} items
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {canMerge && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Merge Preview</p>
                <p className="text-xs text-muted-foreground">
                  {sourceOrder.items.length} item(s) from <span className="font-semibold text-primary">Table {sourceTable!.number}</span>
                  {' → '}
                  <span className="font-semibold text-success">Table {targetTable!.number}</span>
                  {targetOrder && ` (${targetOrder.items.length} existing items)`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Table {sourceTable!.number} will be marked as vacant after merge.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleMerge}
            disabled={!canMerge || merging}
            className="gap-2"
          >
            <Merge className="w-4 h-4" />
            {merging ? 'Merging...' : 'Merge Tables'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
