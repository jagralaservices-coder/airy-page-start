import React, { useState, useMemo } from 'react';
import { Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronRight,
  ShoppingCart,
  FileText,
  Trash2,
  RefreshCw,
  BarChart3,
  ClipboardList,
  Calculator,
  Search,
  Printer,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Settings2,
  Link,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInventory, setInventory, InventoryItem, formatCurrency, generateId, getExpenses, setExpenses, Expense } from '@/lib/store';
import { formatQuantityDisplay, convertToBaseUnit, getBaseUnit, UNIT_CATEGORIES } from '@/lib/inventoryUtils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { InventoryComponentsDialog } from './InventoryComponentsDialog';
import { BulkInventoryUpload } from './BulkInventoryUpload';
import { useSubscription } from '@/hooks/useSubscription';

type ViewType = 'main' | 'purchaseManagement' | 'requestForPurchase' | 'wastage' | 'addWastage' | 'convertRawMaterial' | 'currentStock' | 'openingClosing' | 'indentManagement' | 'productionExecution' | 'bulkUpload' | 'smartInventory';

interface InventoryMenuSection {
  title: string;
  items: {
    id: ViewType;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    color: string;
  }[];
}

export const InventoryView: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewType>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const inventory = getInventory();
  const { canAccess } = useSubscription();

  const hasRecipe = canAccess('recipeInventory');
  const hasSmart = canAccess('smartInventory');

  const menuSections: InventoryMenuSection[] = useMemo(() => {
    const sections: InventoryMenuSection[] = [];

    // Purchase section - always visible (manual inventory is basic)
    const purchaseItems: InventoryMenuSection['items'] = [
      {
        id: 'purchaseManagement',
        icon: ShoppingCart,
        title: 'Purchase Management',
        description: 'Keep a clear record of all raw material purchases and inward entries to maintain accurate inventory tracking.',
        color: 'bg-red-50 text-red-600'
      },
      {
        id: 'requestForPurchase',
        icon: FileText,
        title: 'Request For Purchase',
        description: 'Easily create and track purchase requests (POs) for better procurement management.',
        color: 'bg-cyan-50 text-cyan-600'
      },
      {
        id: 'bulkUpload',
        icon: Upload,
        title: 'Bulk Upload',
        description: 'Upload inventory items in bulk from CSV or Excel files for quick setup.',
        color: 'bg-green-50 text-green-600'
      },
    ];

    // Smart Inventory - only Platinum
    if (hasSmart) {
      purchaseItems.push({
        id: 'smartInventory' as ViewType,
        icon: Brain,
        title: 'Smart Inventory (AI)',
        description: 'AI-powered stock analysis, demand prediction, and auto purchase recommendations.',
        color: 'bg-purple-50 text-purple-600'
      });
    }

    sections.push({ title: 'Purchase', items: purchaseItems });

    // Wastage and Conversion - only Gold+ (recipe-based)
    if (hasRecipe) {
      sections.push({
        title: 'Wastage and Conversion',
        items: [
          {
            id: 'wastage',
            icon: Trash2,
            title: 'Wastage',
            description: 'Record and track raw material or item wastage for accurate inventory management.',
            color: 'bg-red-50 text-red-600'
          },
          {
            id: 'convertRawMaterial',
            icon: RefreshCw,
            title: 'Convert Raw Material',
            description: 'Production of raw materials into cooked or semi-cooked products.',
            color: 'bg-pink-50 text-pink-600'
          }
        ]
      });
    }

    // Reports - always visible
    sections.push({
      title: 'Reports',
      items: [
        {
          id: 'currentStock',
          icon: BarChart3,
          title: 'Current Stock',
          description: 'The report shows the current stock of your ingredients.',
          color: 'bg-red-50 text-red-600'
        },
        {
          id: 'openingClosing',
          icon: ClipboardList,
          title: 'Opening - Closing Report',
          description: 'Displays the opening and closing stock of your ingredients.',
          color: 'bg-orange-50 text-orange-600'
        },
        {
          id: 'indentManagement',
          icon: Calculator,
          title: 'Indent Management',
          description: 'Calculate the raw materials required to prepare specific items in bulk.',
          color: 'bg-yellow-50 text-yellow-600'
        }
      ]
    });

    return sections;
  }, [hasRecipe, hasSmart]);

  // Render sub-views
  if (activeView === 'purchaseManagement') {
    return <PurchaseManagementView onBack={() => setActiveView('main')} />;
  }
  if (activeView === 'requestForPurchase') {
    return <RequestForPurchaseView onBack={() => setActiveView('main')} />;
  }
  if (activeView === 'wastage') {
    return <WastageListingView onBack={() => setActiveView('main')} onAddWastage={() => setActiveView('addWastage')} />;
  }
  if (activeView === 'addWastage') {
    return <AddWastageView onBack={() => setActiveView('wastage')} />;
  }
  if (activeView === 'convertRawMaterial') {
    return <ProductionExecutionView onBack={() => setActiveView('main')} />;
  }
  if (activeView === 'currentStock') {
    return <CurrentStockView onBack={() => setActiveView('main')} inventory={inventory} />;
  }
  if (activeView === 'openingClosing') {
    return <OpeningClosingView onBack={() => setActiveView('main')} />;
  }
  if (activeView === 'indentManagement') {
    return <IndentManagementView onBack={() => setActiveView('main')} inventory={inventory} />;
  }
  if (activeView === 'productionExecution') {
    return <ProductionExecutionView onBack={() => setActiveView('main')} />;
  }
  if (activeView === 'bulkUpload') {
    return <BulkInventoryUpload onBack={() => setActiveView('main')} onComplete={() => setActiveView('purchaseManagement')} />;
  }
  if (activeView === 'smartInventory') {
    navigate('/smart-inventory');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">📦 Inventory Management</h1>
            <p className="text-xs text-muted-foreground">{inventory.length} items tracked</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 pb-24">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className="flex items-center gap-3 w-full p-4 bg-card border border-border/60 rounded-2xl hover:bg-accent/50 transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sub-views
const PurchaseManagementView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [inventory, setLocalInventory] = useState<InventoryItem[]>(getInventory());
  const [searchQuery, setSearchQuery] = useState('');
  const [showComponentsDialog, setShowComponentsDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { canAccess: canAccessFeature } = useSubscription();
  const hasRecipeAccess = canAccessFeature('recipeManagement');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    costPerUnit: '',
    costUnit: 'kg', // Unit for cost (kg, g, ltr, ml, pcs)
    minStock: '10',
    isManufactured: false
  });

  const handleAddPurchase = () => {
    if (!formData.name) {
      toast.error('Item name is required');
      return;
    }

    // Convert to base unit (grams or ml) for storage
    const quantityInBase = formData.quantity ? convertToBaseUnit(parseFloat(formData.quantity), formData.unit) : 0;
    const baseUnit = getBaseUnit(formData.unit);

    const existingItem = inventory.find(i => i.name.toLowerCase() === formData.name.toLowerCase());
    
    if (existingItem) {
      // Add to existing inventory (quantity is always in base unit)
      const updatedInventory = inventory.map(item => 
        item.id === existingItem.id 
          ? { 
              ...item, 
              quantity: item.quantity + quantityInBase,
              costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : item.costPerUnit,
              isManufactured: formData.isManufactured || item.isManufactured,
              lastUpdated: new Date()
            }
          : item
      );
      setInventory(updatedInventory);
      setLocalInventory(updatedInventory);
      toast.success(`Added ${formData.quantity} ${formData.unit} to ${formData.name}`);
    } else {
      // Create new inventory item with base unit
      const newItem: InventoryItem = {
        id: generateId(),
        name: formData.name,
        quantity: quantityInBase,
        unit: baseUnit, // Store in base unit (g, ml, pcs)
        costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : 0,
        costUnit: formData.costUnit, // Store cost unit
        minStock: convertToBaseUnit(parseFloat(formData.minStock), formData.unit), // Also convert minStock
        isManufactured: formData.isManufactured,
        lastUpdated: new Date()
      };
      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      setLocalInventory(updatedInventory);
      toast.success(`New item "${formData.name}" added to inventory`);
    }

    const costPerUnit = formData.costPerUnit ? parseFloat(formData.costPerUnit) : 0;
    
    // Check if the item is a manufactured product (has components)
    const hasComponents = existingItem && existingItem.components && existingItem.components.length > 0;
    
    // Automatically add an expense for this purchase, ONLY if it's not a manufactured product
    if (costPerUnit > 0 && parseFloat(formData.quantity) > 0 && !hasComponents && !formData.isManufactured) {
      let totalExpense = 0;
      if (formData.costUnit === 'kg' && formData.unit === 'g') {
        totalExpense = (parseFloat(formData.quantity) / 1000) * costPerUnit;
      } else if (formData.costUnit === 'ltr' && formData.unit === 'ml') {
        totalExpense = (parseFloat(formData.quantity) / 1000) * costPerUnit;
      } else if (formData.costUnit === 'g' && formData.unit === 'kg') {
        totalExpense = (parseFloat(formData.quantity) * 1000) * costPerUnit;
      } else if (formData.costUnit === 'ml' && formData.unit === 'ltr') {
        totalExpense = (parseFloat(formData.quantity) * 1000) * costPerUnit;
      } else {
        totalExpense = parseFloat(formData.quantity) * costPerUnit;
      }

      if (totalExpense > 0) {
        const newExpense: Expense = {
          id: generateId(),
          category: 'Inventory Purchase',
          amount: totalExpense,
          description: `Purchased ${formData.quantity} ${formData.unit} of ${formData.name}`,
          date: new Date(),
          paidBy: 'System'
        };
        setExpenses([newExpense, ...getExpenses()]);
        toast.success(`Expense of ₹${totalExpense.toFixed(2)} automatically recorded for this purchase`);
      }
    }

    setFormData({ name: '', quantity: '', unit: 'kg', costPerUnit: '', costUnit: 'kg', minStock: '10', isManufactured: false });
    setShowAddDialog(false);
  };

  const handleEditItem = () => {
    if (!editingItem || !formData.name) {
      toast.error('Item name is required');
      return;
    }

    // Convert to base unit for storage
    const quantityInBase = formData.quantity ? convertToBaseUnit(parseFloat(formData.quantity), formData.unit) : 0;
    const baseUnit = getBaseUnit(formData.unit);
    const costPerUnit = formData.costPerUnit ? parseFloat(formData.costPerUnit) : 0;

    // Check if the item is manufactured
    const isManufactured = formData.isManufactured || (editingItem.components && editingItem.components.length > 0);

    // Calculate delta for automatic expense generation
    const oldQtyInBase = editingItem.quantity;
    const deltaInBase = quantityInBase - oldQtyInBase;

    // Only log expense if stock increased and it's a purchased item
    if (deltaInBase > 0 && costPerUnit > 0 && !isManufactured) {
      let totalExpense = 0;
      let addedDisplayQty = deltaInBase;
      let displayUnit = baseUnit;

      if (formData.costUnit === 'kg' && baseUnit === 'g') {
        totalExpense = (deltaInBase / 1000) * costPerUnit;
        addedDisplayQty = deltaInBase / 1000;
        displayUnit = 'kg';
      } else if (formData.costUnit === 'ltr' && baseUnit === 'ml') {
        totalExpense = (deltaInBase / 1000) * costPerUnit;
        addedDisplayQty = deltaInBase / 1000;
        displayUnit = 'ltr';
      } else if (formData.costUnit === 'g' && baseUnit === 'kg') {
        totalExpense = (deltaInBase * 1000) * costPerUnit;
        addedDisplayQty = deltaInBase;
        displayUnit = 'g';
      } else if (formData.costUnit === 'ml' && baseUnit === 'ltr') {
        totalExpense = (deltaInBase * 1000) * costPerUnit;
        addedDisplayQty = deltaInBase;
        displayUnit = 'ml';
      } else {
        totalExpense = deltaInBase * costPerUnit;
      }

      if (totalExpense > 0) {
        const newExpense: Expense = {
          id: generateId(),
          category: 'Inventory Purchase',
          amount: totalExpense,
          description: `Stock adjusted (+${addedDisplayQty} ${displayUnit}) for ${formData.name}`,
          date: new Date(),
          paidBy: 'System'
        };
        setExpenses([newExpense, ...getExpenses()]);
        toast.success(`Expense of ₹${totalExpense.toFixed(2)} automatically recorded for added stock`);
      }
    }

    const updatedInventory = inventory.map(item => 
      item.id === editingItem.id 
        ? { 
            ...item, 
            name: formData.name,
            quantity: quantityInBase,
            unit: baseUnit,
            costPerUnit: costPerUnit,
            costUnit: formData.costUnit,
            minStock: convertToBaseUnit(parseFloat(formData.minStock), formData.unit),
            isManufactured: formData.isManufactured,
            lastUpdated: new Date()
          }
        : item
    );
    setInventory(updatedInventory);
    setLocalInventory(updatedInventory);
    toast.success(`"${formData.name}" updated`);

    setFormData({ name: '', quantity: '', unit: 'kg', costPerUnit: '', costUnit: 'kg', minStock: '10', isManufactured: false });
    setEditingItem(null);
    setShowEditDialog(false);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    const updatedInventory = inventory.filter(i => i.id !== item.id);
    setInventory(updatedInventory);
    setLocalInventory(updatedInventory);
    
    // Track deletion for cloud sync
    try {
      const storeDataStr = localStorage.getItem('pos_active_store_data');
      const storeId = localStorage.getItem('owner_selected_store_id') || (storeDataStr ? JSON.parse(storeDataStr).id : null);
      if (storeId) {
        const deletedKey = `pos_deleted_inventory_${storeId}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]');
        deletedIds.push(item.id);
        localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.error('Error tracking deleted inventory item:', e);
    }
    
    toast.success(`"${item.name}" deleted`);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    // For editing, show in the appropriate display unit
    const category = UNIT_CATEGORIES[item.unit] || 'count';
    const displayUnit = category === 'weight' ? 'kg' : category === 'volume' ? 'ltr' : item.unit;
    
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(), // Keep as base unit, user can enter in any format
      unit: displayUnit,
      costPerUnit: item.costPerUnit.toString(),
      costUnit: item.costUnit || displayUnit,
      minStock: item.minStock.toString(),
      isManufactured: item.isManufactured || false
    });
    setShowEditDialog(true);
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openComponents = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowComponentsDialog(true);
  };

  const refreshInventory = () => {
    setLocalInventory(getInventory());
  };

  const handleMigrateToExpenses = () => {
    let newExpensesCount = 0;
    const currentExpenses = getExpenses();
    const newExpensesList: Expense[] = [];

    inventory.forEach(item => {
      // Don't add if it has components (manufactured product)
      if (item.isManufactured || (item.components && item.components.length > 0)) return;
      
      const costPerUnit = item.costPerUnit || 0;
      if (costPerUnit > 0 && item.quantity > 0) {
        let totalExpense = 0;
        const costUnit = item.costUnit || item.unit;
        
        if (costUnit === 'kg' && item.unit === 'g') {
          totalExpense = (item.quantity / 1000) * costPerUnit;
        } else if (costUnit === 'ltr' && item.unit === 'ml') {
          totalExpense = (item.quantity / 1000) * costPerUnit;
        } else if (costUnit === 'g' && item.unit === 'kg') {
          totalExpense = (item.quantity * 1000) * costPerUnit;
        } else if (costUnit === 'ml' && item.unit === 'ltr') {
          totalExpense = (item.quantity * 1000) * costPerUnit;
        } else {
          totalExpense = item.quantity * costPerUnit;
        }

        if (totalExpense > 0) {
          const newExpense: Expense = {
            id: generateId() + Math.random().toString(36).substring(7),
            category: 'Inventory Purchase',
            amount: totalExpense,
            description: `Initial stock: ${item.quantity} ${item.unit} of ${item.name}`,
            date: new Date(),
            paidBy: 'System'
          };
          newExpensesList.push(newExpense);
          newExpensesCount++;
        }
      }
    });

    if (newExpensesCount > 0) {
      setExpenses([...newExpensesList, ...currentExpenses]);
      toast.success(`Successfully added ${newExpensesCount} items to expenses!`);
    } else {
      toast.info('No eligible items to migrate.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Purchase Management</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search inventory..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add Purchase
          </Button>
        </div>

        {filteredInventory.length === 0 ? (
          <EmptyState message="There is no purchase record available." />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Item Name</th>
                  <th className="text-left p-3 text-sm font-medium">Quantity</th>
                  <th className="text-left p-3 text-sm font-medium">Cost/Unit</th>
                  <th className="text-left p-3 text-sm font-medium">Total Cost</th>
                  {hasRecipeAccess && <th className="text-left p-3 text-sm font-medium">Components</th>}
                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  // Calculate total stock cost and per unit cost
                  const costUnit = item.costUnit || item.unit;
                  const costUnitLabel = costUnit.toUpperCase();
                  
                  let perUnitCost = item.costPerUnit;
                  
                  // Dynamically calculate cost for items with components
                  if (item.components && item.components.length > 0) {
                    let totalCompCost = 0;
                    let totalCompWeightBase = 0;
                    item.components.forEach(c => {
                      const compItem = inventory.find(i => i.id === c.childInventoryId);
                      if (compItem) {
                        let cBaseCost = compItem.costPerUnit;
                        const cCostUnit = compItem.costUnit || compItem.unit;
                        if (cCostUnit === 'kg' || cCostUnit === 'ltr') cBaseCost = compItem.costPerUnit / 1000;
                        
                        let cQtyBase = c.quantityRequired;
                        if (c.unit === 'kg' || c.unit === 'ltr') cQtyBase = c.quantityRequired * 1000;
                        
                        totalCompCost += cBaseCost * cQtyBase;
                        totalCompWeightBase += cQtyBase;
                      }
                    });
                    
                    const yieldFactor = (item.productionYieldUnit === 'kg' || item.productionYieldUnit === 'ltr') ? 1000 : 1;
                    const yieldBase = (item.productionYield || 0) * yieldFactor;
                    const effectiveYield = yieldBase > 0 ? yieldBase : totalCompWeightBase;
                    
                    if (effectiveYield > 0) {
                      const costPerBaseUnit = totalCompCost / effectiveYield;
                      if (costUnit === 'kg' || costUnit === 'ltr') {
                        perUnitCost = costPerBaseUnit * 1000;
                      } else {
                        perUnitCost = costPerBaseUnit;
                      }
                    }
                  }
                  
                  // If cost is per KG but quantity is in grams, convert
                  let totalCost = 0;
                  if (costUnit === 'kg' && item.unit === 'g') {
                    totalCost = (item.quantity / 1000) * perUnitCost;
                    // perUnitCost is already per KG, so cost per base unit is perUnitCost / 1000
                    var displayBaseCost = perUnitCost / 1000; 
                  } else if (costUnit === 'ltr' && item.unit === 'ml') {
                    totalCost = (item.quantity / 1000) * perUnitCost;
                    var displayBaseCost = perUnitCost / 1000;
                  } else {
                    totalCost = item.quantity * perUnitCost;
                    var displayBaseCost = perUnitCost;
                  }
                  
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 font-mono text-sm">{formatQuantityDisplay(item.quantity, item.unit)}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{formatCurrency(perUnitCost)}/{costUnitLabel}</span>
                          {(costUnit === 'kg' || costUnit === 'ltr') && (
                            <span className="text-xs text-muted-foreground">
                              ({formatCurrency(displayBaseCost)}/{costUnit === 'kg' ? 'GM' : 'ML'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-primary">{formatCurrency(totalCost)}</span>
                      </td>
                      {hasRecipeAccess && (
                        <td className="p-3">
                          {item.components && item.components.length > 0 ? (
                            <span className="text-sm text-primary flex items-center gap-1">
                              <Link className="w-3 h-3" />
                              {item.components.length} items
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1 text-xs"
                            onClick={() => openEditDialog(item)}
                          >
                            <Settings2 className="w-3 h-3" />
                            Edit
                          </Button>
                           {hasRecipeAccess && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 text-xs"
                              onClick={() => openComponents(item)}
                            >
                              <Link className="w-3 h-3" />
                              Components
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <InventoryComponentsDialog
          open={showComponentsDialog}
          onOpenChange={setShowComponentsDialog}
          inventoryItem={selectedItem}
          onSave={refreshInventory}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Item Name *</Label>
              <Input 
                placeholder="Enter item name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ltr">ltr</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost per Unit</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({...formData, costPerUnit: e.target.value})}
                />
              </div>
              <div>
                <Label>Cost Unit</Label>
                <Select value={formData.costUnit} onValueChange={(v) => setFormData({...formData, costUnit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">per KG</SelectItem>
                    <SelectItem value="g">per GM</SelectItem>
                    <SelectItem value="ltr">per LTR</SelectItem>
                    <SelectItem value="ml">per ML</SelectItem>
                    <SelectItem value="pcs">per PCS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Min Stock Alert</Label>
              <Input 
                type="number"
                placeholder="10"
                value={formData.minStock}
                onChange={(e) => setFormData({...formData, minStock: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="isManufacturedAdd" 
                checked={formData.isManufactured}
                onCheckedChange={(checked) => setFormData({...formData, isManufactured: checked === true})}
              />
              <Label htmlFor="isManufacturedAdd" className="text-sm font-normal cursor-pointer leading-tight">
                Manufactured Item (Produced internally, do not count as expense)
              </Label>
            </div>
            <Button className="w-full mt-4" onClick={handleAddPurchase}>
              Add to Inventory
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Item Name *</Label>
              <Input 
                placeholder="Enter item name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ltr">ltr</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost per Unit</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({...formData, costPerUnit: e.target.value})}
                />
              </div>
              <div>
                <Label>Cost Unit</Label>
                <Select value={formData.costUnit} onValueChange={(v) => setFormData({...formData, costUnit: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">per KG</SelectItem>
                    <SelectItem value="g">per GM</SelectItem>
                    <SelectItem value="ltr">per LTR</SelectItem>
                    <SelectItem value="ml">per ML</SelectItem>
                    <SelectItem value="pcs">per PCS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Min Stock Alert</Label>
              <Input 
                type="number"
                placeholder="10"
                value={formData.minStock}
                onChange={(e) => setFormData({...formData, minStock: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="isManufacturedEdit" 
                checked={formData.isManufactured}
                onCheckedChange={(checked) => setFormData({...formData, isManufactured: checked === true})}
              />
              <Label htmlFor="isManufacturedEdit" className="text-sm font-normal cursor-pointer leading-tight">
                Manufactured Item (Produced internally, do not count as expense)
              </Label>
            </div>
            <Button className="w-full mt-4" onClick={handleEditItem}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RequestForPurchaseView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Request For Purchase List</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" />
              Add Request For Purchase
            </Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-48" />
          </div>
        </div>
        <EmptyState message="There is no purchase order available." />
      </div>
    </div>
  );
};

const WastageListingView: React.FC<{ onBack: () => void; onAddWastage: () => void }> = ({ onBack, onAddWastage }) => {
  const [wastageReportsOpen, setWastageReportsOpen] = useState(true);
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentYear, currentDate.getMonth());
  const weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Wastage Listing</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2 bg-primary text-primary-foreground" onClick={onAddWastage}>
              <Plus className="w-4 h-4" />
              Add Wastage
            </Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-48" />
          </div>
        </div>

        <Collapsible open={wastageReportsOpen} onOpenChange={setWastageReportsOpen}>
          <CollapsibleTrigger className="flex items-center gap-3 w-full p-4 bg-card border border-border rounded-lg mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium flex-1 text-left">Wastage Reports</span>
            {wastageReportsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-4 bg-muted/30 flex items-center">
                <ChevronUp className="w-4 h-4 mr-2" />
                <span className="font-medium">{currentMonth} {currentYear}</span>
              </div>
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map(day => (
                  <div key={day} className="p-3 text-xs font-medium text-muted-foreground text-center border-r last:border-r-0 border-border">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-4 border-r border-b border-border last:border-r-0" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDate.getDate();
                  return (
                    <div
                      key={day}
                      className={`p-4 border-r border-b border-border last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
                    >
                      <div className="text-sm font-medium mb-2">{day.toString().padStart(2, '0')} {currentMonth}</div>
                      <div className="bg-muted text-muted-foreground text-sm px-2 py-1 rounded">₹ 0.00</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 p-2 bg-muted/30 rounded">
              Wastage Report: from {new Date(currentYear, currentDate.getMonth() - 1, 28).toLocaleDateString('en-GB').replace(/\//g, '-')} to {currentDate.toLocaleDateString('en-GB').replace(/\//g, '-')}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

const AddWastageView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [wastageItems, setWastageItems] = useState([{ id: 1, item: '', quantity: '', unit: '', avgPrice: '', amount: '', description: '' }]);
  const [wastageFor, setWastageFor] = useState('rawMaterial');

  const addNewItem = () => {
    setWastageItems([...wastageItems, { id: Date.now(), item: '', quantity: '', unit: '', avgPrice: '', amount: '', description: '' }]);
  };

  const removeItem = (id: number) => {
    if (wastageItems.length > 1) {
      setWastageItems(wastageItems.filter(item => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Add Wastage</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="font-semibold mb-6">Wastage Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label>Date *</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <Label>Wastage for</Label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="wastageFor" 
                    checked={wastageFor === 'rawMaterial'}
                    onChange={() => setWastageFor('rawMaterial')}
                    className="w-4 h-4 text-primary"
                  />
                  Raw Material
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="wastageFor"
                    checked={wastageFor === 'item'}
                    onChange={() => setWastageFor('item')}
                    className="w-4 h-4 text-primary"
                  />
                  Item
                </label>
              </div>
            </div>
          </div>

          <Button onClick={addNewItem} className="mb-6 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-primary">Wastage Item Details *</th>
                  <th className="text-left p-2 text-sm font-medium text-primary">Quantity *</th>
                  <th className="text-left p-2 text-sm font-medium text-primary">Unit *</th>
                  <th className="text-left p-2 text-sm font-medium">Avg. Purchase Price</th>
                  <th className="text-left p-2 text-sm font-medium">Amount</th>
                  <th className="text-left p-2 text-sm font-medium">Description & Action</th>
                </tr>
              </thead>
              <tbody>
                {wastageItems.map((item) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="p-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Raw Material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="item1">Raw Material 1</SelectItem>
                          <SelectItem value="item2">Raw Material 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input placeholder="Quantity" />
                    </td>
                    <td className="p-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="g">Grams</SelectItem>
                          <SelectItem value="l">Liters</SelectItem>
                          <SelectItem value="pcs">Pieces</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input placeholder="Avg. Purchase Price" readOnly className="bg-muted" />
                    </td>
                    <td className="p-2">
                      <Input placeholder="Amount" readOnly className="bg-muted" />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
            <span className="text-primary">ⓘ</span>
            Note: Select raw materials and click the calculate button to generate indent management.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProductionExecutionView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Production Execution</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-48" />
          </div>
        </div>
        <EmptyState message="There is no record available." />
      </div>
    </div>
  );
};

const CurrentStockView: React.FC<{ onBack: () => void; inventory: InventoryItem[] }> = ({ onBack, inventory }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Current Stock</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>
        {inventory.length === 0 ? (
          <EmptyState message="There is no record available." />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Item Name</th>
                  <th className="text-left p-3 font-medium">Quantity</th>
                  <th className="text-left p-3 font-medium">Unit</th>
                  <th className="text-left p-3 font-medium">Cost Per Unit</th>
                  <th className="text-left p-3 font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 font-mono text-sm">{formatQuantityDisplay(item.quantity, item.unit)}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3">{formatCurrency(item.costPerUnit)}</td>
                    <td className="p-3">{formatCurrency((item.quantity / 1000) * item.costPerUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const OpeningClosingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Opening - Closing Report</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10 w-48" />
            </div>
            <Button variant="outline" className="gap-2">
              Configure Column
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>
        <EmptyState message="There is no record available." />
      </div>
    </div>
  );
};

const IndentManagementView: React.FC<{ onBack: () => void; inventory: InventoryItem[] }> = ({ onBack, inventory }) => {
  const [items, setItems] = useState([{ id: 1, item: '', quantity: '' }]);

  const addNewItem = () => {
    setItems([...items, { id: Date.now(), item: '', quantity: '' }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const clearAll = () => {
    setItems([{ id: 1, item: '', quantity: '' }]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Indent Management</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="border border-border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <p className="text-foreground">Enter item(s) to get calculation</p>
            <div className="flex items-center gap-2">
              <Button onClick={addNewItem} className="bg-primary text-primary-foreground">
                Add New
              </Button>
              <Button variant="outline" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-left p-2 font-medium">Quantity</th>
                  <th className="text-left p-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="p-2">
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input placeholder="" className="w-32" />
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="text-primary">ⓘ</span>
              Note: Select raw materials and click the calculate button to generate indent management.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset
              </Button>
              <Button className="bg-primary text-primary-foreground gap-2">
                <Calculator className="w-4 h-4" />
                Calculate
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="border border-border rounded-lg p-12 bg-card">
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-20 h-24 bg-muted rounded-lg mb-4 flex items-center justify-center relative">
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-muted-foreground/20 rounded-full flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);
