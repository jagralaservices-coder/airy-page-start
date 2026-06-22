import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

export const TablesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, setSelectedTable, updateTableStatus, orders } = usePOS();

  const handleTableClick = (table: typeof tables[0]) => {
    if (table.status === 'available') {
      setSelectedTable(table);
      updateTableStatus(table.id, 'occupied');
      navigate('/pos');
    } else if (table.status === 'occupied') {
      setSelectedTable(table);
      navigate('/pos');
    }
  };

  const getTableOrder = (tableNumber: number) => {
    return orders.find(o => 
      o.tableNumber === tableNumber && 
      (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Table Management</h1>
        <p className="text-muted-foreground">Select a table to start order</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm">Vacant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm">Billed</span>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => {
          const order = getTableOrder(table.number);
          const hasBill = !!order;

          return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={cn(
                'pos-card-interactive p-4 flex flex-col items-center gap-2 min-h-[120px]',
                table.status === 'available' && 'border-success/30 hover:border-success',
                table.status === 'occupied' && 'border-warning/30 hover:border-warning',
                hasBill && 'border-destructive/30 hover:border-destructive'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold',
                table.status === 'available' && 'bg-success/15 text-success',
                table.status === 'occupied' && !hasBill && 'bg-warning/15 text-warning',
                hasBill && 'bg-destructive/15 text-destructive'
              )}>
                {table.number}
              </div>
              
              <div className="text-center">
                <p className={cn(
                  'text-xs font-medium',
                  table.status === 'available' && 'text-success',
                  table.status === 'occupied' && !hasBill && 'text-warning',
                  hasBill && 'text-destructive'
                )}>
                  {table.status === 'available' ? 'Vacant' : hasBill ? 'Has Bill' : 'Occupied'}
                </p>
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <Users className="w-3 h-3" />
                  <span>{table.capacity}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TablesPage;
