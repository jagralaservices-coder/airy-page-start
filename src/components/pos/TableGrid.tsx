import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { Users, ArrowLeft, Utensils, Merge, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableMergeDialog } from './TableMergeDialog';

export const TableGrid: React.FC = () => {
  const navigate = useNavigate();
  const { tables, orders, selectedTable, setSelectedTable, updateTableStatus, setCurrentOrderType } = usePOS();
  const { t } = useLocale();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('all');

  // Load table settings for sections and names
  const tableSettings = useMemo(() => {
    try {
      const saved = localStorage.getItem('table_settings');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  const sections = useMemo(() => tableSettings?.sections || [], [tableSettings]);

  // Enrich tables with name/section from settings
  const enrichedTables = useMemo(() => {
    if (!tableSettings?.tables) return tables;
    return tables.map(table => {
      const config = tableSettings.tables.find((tc: any) => tc.number === table.number);
      return {
        ...table,
        name: config?.name || table.name,
        section: config?.section || table.section || 'Main Hall',
      };
    });
  }, [tables, tableSettings]);

  const filteredTables = useMemo(() => {
    if (activeSection === 'all') return enrichedTables;
    return enrichedTables.filter(t => t.section === activeSection);
  }, [enrichedTables, activeSection]);

  const availableCount = enrichedTables.filter(t => t.status === 'available').length;
  const occupiedCount = enrichedTables.filter(t => t.status === 'occupied').length;
  const reservedCount = enrichedTables.filter(t => t.status === 'reserved').length;

  const getTableOrder = (tableNumber: number) => {
    return orders.find(o =>
      o.tableNumber === tableNumber &&
      !o.isDirectBill &&
      (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    );
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 border-success/30 hover:border-success/60';
      case 'occupied':
        return 'bg-destructive/10 border-destructive/30 hover:border-destructive/60 cursor-pointer';
      case 'reserved':
        return 'bg-warning/10 border-warning/30';
      default:
        return '';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success';
      case 'occupied': return 'bg-destructive';
      case 'reserved': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const handleTableClick = (table: typeof enrichedTables[0]) => {
    if (table.status === 'available') {
      setSelectedTable(selectedTable?.id === table.id ? null : table);
    } else if (table.status === 'occupied') {
      // Select occupied table and navigate to POS to add more items (auto-merge)
      setSelectedTable(table);
      setCurrentOrderType('dine-in');
      navigate('/pos');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t('tables.tableManagement')}</h1>
            <p className="text-xs text-muted-foreground">{tables.length} {t('tables.tableManagement').toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMergeOpen(true)}
              disabled={tables.filter(t => t.status === 'occupied').length < 2}
            >
              <Merge className="w-4 h-4" />
              <span className="hidden sm:inline">Merge</span>
            </Button>
            <Utensils className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3 px-4 pb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs font-medium text-success">{availableCount} {t('tables.vacant')}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-xs font-medium text-destructive">{occupiedCount} {t('tables.occupied')}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-xs font-medium text-warning">{reservedCount} {t('tables.reserved')}</span>
          </div>
        </div>

        {/* Section Tabs */}
        {sections.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveSection('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                activeSection === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              All Sections
            </button>
            {sections.map((section: string) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                  activeSection === section
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {section}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredTables.map((table) => {
            const order = getTableOrder(table.number);
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                  'relative rounded-2xl border-2 p-4 text-center transition-all duration-200 active:scale-95',
                  getStatusStyles(table.status),
                  selectedTable?.id === table.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  table.status === 'available' && 'cursor-pointer'
                )}
              >
                {/* Status dot */}
                <div className={cn('absolute top-2 right-2 w-2.5 h-2.5 rounded-full', getStatusDot(table.status))} />
                
                <div className="text-2xl font-bold text-foreground mb-1">
                  {table.name || `T${table.number}`}
                </div>
                {table.name && (
                  <div className="text-[10px] text-muted-foreground">#{table.number}</div>
                )}
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{table.capacity}</span>
                </div>
                {table.section && activeSection === 'all' && (
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">
                    {table.section}
                  </div>
                )}
                <div className={cn(
                  'mt-1 text-[10px] font-bold uppercase tracking-wider',
                  table.status === 'available' ? 'text-success' :
                  table.status === 'occupied' ? 'text-destructive' : 'text-warning'
                )}>
                  {table.status === 'available' ? t('tables.vacant') :
                   table.status === 'occupied' ? t('tables.occupied') : t('tables.reserved')}
                </div>
                {/* Show item count for occupied tables */}
                {order && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-primary font-medium">
                    <ShoppingCart className="w-3 h-3" />
                    {order.items.length} items
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Table Action Bar */}
      {selectedTable && selectedTable.status === 'available' && (
        <div className="fixed bottom-6 left-4 right-4 bg-card border border-border rounded-2xl px-5 py-4 shadow-2xl flex items-center justify-between animate-slide-in-up z-50">
          <div>
            <span className="text-xs text-muted-foreground">{t('tables.selectTable')}</span>
            <p className="text-lg font-bold text-primary">
              {selectedTable.name || `${t('pos.tableNumber')} ${selectedTable.number}`}
            </p>
          </div>
          <a href="/pos" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
            {t('orders.newOrder')}
          </a>
        </div>
      )}

      <TableMergeDialog open={mergeOpen} onOpenChange={setMergeOpen} />
    </div>
  );
};
