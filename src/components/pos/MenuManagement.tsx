import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency, MenuItem, getInventory, InventoryItem } from '@/lib/store';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { 
  Search, 
  ToggleLeft, 
  ToggleRight,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  Package,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Check,
  Minus,
  PlusCircle,
  Store,
  ChevronDown,
  Link2,
  UtensilsCrossed,
  Barcode,
  Printer
} from 'lucide-react';
import { BulkMenuUpload } from './BulkMenuUpload';
import { VariationManagementDialog } from './VariationManagementDialog';
import { BarcodePrintDialog } from './BarcodePrintDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MenuImageUpload } from './MenuImageUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MenuIngredientsDialog } from './MenuIngredientsDialog';
import { MenuItemIngredient, MenuItemVariation } from '@/lib/store';
interface ParsedMenuItem {
  name: string;
  nameHindi?: string;
  price: number;
  category: string;
  description?: string;
}

export const MenuManagement: React.FC = () => {
  const navigate = useNavigate();
  const { menuItems, categories, toggleItemAvailability, activeCategory, setActiveCategory, addMenuItems, deleteMenuItem, updateMenuItem, syncCategoriesFromMenu, lowStockItems, stores, activeStore, setActiveStoreId, getStoreSales, addCategory, isStoreLogin } = usePOS();
  const { canAccess: canAccessFeature } = useSubscription();
  const hasRecipeAccess = canAccessFeature('recipeInventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: categories[0]?.id || '', stock: '', linkedInventoryId: '', gramagePerUnit: '', sku: '', isVariable: false, isPrompt: false });
  
  // Category creation states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [categorySource, setCategorySource] = useState<'new' | 'edit'>('new');
  const [newItemImage, setNewItemImage] = useState('');
  const [editItem, setEditItem] = useState({ name: '', price: '', category: '', stock: '', storeStocks: {} as { [key: string]: string }, stockAlertThreshold: '', linkedInventoryId: '', gramagePerUnit: '', sku: '', image: '', isVariable: false, isPrompt: false });
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [recipeMenuItem, setRecipeMenuItem] = useState<MenuItem | null>(null);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [variationMenuItem, setVariationMenuItem] = useState<MenuItem | null>(null);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeMenuItem, setBarcodeMenuItem] = useState<MenuItem | null>(null);

  // Load inventory items
  useEffect(() => {
    setInventoryItems(getInventory());
  }, []);

  // Auto-select first category if currently empty and categories load
  useEffect(() => {
    if (categories.length > 0 && !newItem.category) {
      setNewItem(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [categories, newItem.category]);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.nameHindi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBulkImport = (items: ParsedMenuItem[]) => {
    console.log('Imported items:', items);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const catId = newCategoryName.toLowerCase().trim().replace(/\s+/g, '-');
    await addCategory({
      id: catId,
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || '🍽️'
    });
    
    // Auto-select the newly created category
    if (categorySource === 'new') {
      setNewItem(prev => ({ ...prev, category: catId }));
    } else {
      setEditItem(prev => ({ ...prev, category: catId }));
    }
    
    setShowAddCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('🍽️');
    toast.success('Category added successfully!');
  };

  const handleAddItem = async () => {
    if (!newItem.name || (!newItem.price && !newItem.isPrompt)) {
      toast.error('Please fill all fields');
      return;
    }
    const added = await addMenuItems([{
      name: newItem.name,
      price: newItem.isPrompt ? 0 : Number(newItem.price),
      category: newItem.category,
      preparationTime: newItem.isPrompt ? 998 : (newItem.isVariable ? 999 : 10),
      stock: newItem.stock ? Number(newItem.stock) : undefined,
      linkedInventoryId: newItem.linkedInventoryId || undefined,
      gramagePerUnit: newItem.gramagePerUnit ? Number(newItem.gramagePerUnit) : undefined,
      sku: newItem.sku.trim() || undefined,
      image: newItemImage || undefined
    }]);
    if (!added) return;
    toast.success('Item added successfully!');
    setNewItem({ name: '', price: '', category: categories[0]?.id || 'general', stock: '', linkedInventoryId: '', gramagePerUnit: '', sku: '', isVariable: false, isPrompt: false });
    setNewItemImage('');
    setShowAddItem(false);
  };

  const handleEditItem = () => {
    if (!editingItem || !editItem.name || (!editItem.price && !editItem.isPrompt)) {
      toast.error('Please fill all fields');
      return;
    }
    
    // Convert store stocks to numbers
    const storeStock: { [key: string]: number } = {};
    Object.keys(editItem.storeStocks).forEach(storeId => {
      if (editItem.storeStocks[storeId]) {
        storeStock[storeId] = Number(editItem.storeStocks[storeId]);
      }
    });
    
    updateMenuItem(editingItem.id, {
      name: editItem.name,
      price: editItem.isPrompt ? 0 : Number(editItem.price),
      category: editItem.category,
      preparationTime: editItem.isPrompt ? 998 : (editItem.isVariable ? 999 : 10),
      stock: editItem.stock ? Number(editItem.stock) : undefined,
      storeStock: Object.keys(storeStock).length > 0 ? storeStock : undefined,
      stockAlertThreshold: editItem.stockAlertThreshold ? Number(editItem.stockAlertThreshold) : undefined,
      linkedInventoryId: editItem.linkedInventoryId || undefined,
      gramagePerUnit: editItem.gramagePerUnit ? Number(editItem.gramagePerUnit) : undefined,
      sku: editItem.sku.trim() || undefined,
      image: editItem.image || undefined
    });
    toast.success('Item updated successfully!');
    setShowEditItem(false);
    setEditingItem(null);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    const storeStocks: { [key: string]: string } = {};
    if (item.storeStock) {
      Object.keys(item.storeStock).forEach(storeId => {
        storeStocks[storeId] = String(item.storeStock![storeId]);
      });
    }
    setEditItem({
      name: item.name,
      price: String(item.price),
      category: item.category,
      stock: item.stock !== undefined ? String(item.stock) : '',
      storeStocks,
      stockAlertThreshold: item.stockAlertThreshold !== undefined ? String(item.stockAlertThreshold) : '',
      linkedInventoryId: item.linkedInventoryId || '',
      gramagePerUnit: item.gramagePerUnit !== undefined ? String(item.gramagePerUnit) : '',
      sku: item.sku || '',
      image: item.image || '',
      isVariable: false,
      isPrompt: item.preparationTime === 998 || item.preparationTime === 999,
    });
    setShowEditItem(true);
  };

  const openBarcodeDialog = (item: MenuItem) => {
    setBarcodeMenuItem(item);
    setShowBarcodeDialog(true);
  };

  // Quick inline stock update
  const handleQuickStockUpdate = (itemId: string, newStock: number) => {
    if (newStock >= 0) {
      updateMenuItem(itemId, { stock: newStock });
      toast.success('Stock updated!');
    }
    setEditingStockId(null);
    setTempStock('');
  };

  const startEditingStock = (item: MenuItem) => {
    const storeStock = activeStore && item.storeStock?.[activeStore.id];
    const currentStock = storeStock !== undefined ? storeStock : item.stock;
    setEditingStockId(item.id);
    setTempStock(currentStock !== undefined ? String(currentStock) : '100');
  };

  const openRecipeDialog = (item: MenuItem) => {
    setRecipeMenuItem(item);
    setShowRecipeDialog(true);
  };

  const openVariationDialog = (item: MenuItem) => {
    setVariationMenuItem(item);
    setShowVariationDialog(true);
  };

  const handleSaveRecipe = (ingredients: MenuItemIngredient[]) => {
    if (recipeMenuItem) {
      updateMenuItem(recipeMenuItem.id, { ingredients });
      setRecipeMenuItem(null);
    }
  };

  const handleSaveVariations = (variations: MenuItemVariation[]) => {
    if (variationMenuItem) {
      updateMenuItem(variationMenuItem.id, { variations });
      setVariationMenuItem(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button and Store Selector */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground">Add and manage menu items</p>
          </div>
        </div>
      </div>
      <BulkMenuUpload
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onItemsImported={handleBulkImport}
      />

      {/* Add Item Dialog */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Item</h2>
              <button onClick={() => setShowAddItem(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
              <Input
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              />
              <MenuImageUpload imageUrl={newItemImage} onImageChange={setNewItemImage} />
              <Input
                type="number"
                placeholder={newItem.isPrompt ? "Dynamic Price (Prompt on Selection)" : "Price"}
                value={newItem.isPrompt ? "" : newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                disabled={newItem.isPrompt}
              />
              <select
                value={newItem.category}
                onChange={(e) => {
                  if (e.target.value === 'add_new_category') {
                    setCategorySource('new');
                    setNewCategoryName('');
                    setNewCategoryIcon('🍽️');
                    setShowAddCategory(true);
                  } else {
                    setNewItem(prev => ({ ...prev, category: e.target.value }));
                  }
                }}
                className="w-full p-3 bg-secondary rounded-lg border-none"
              >
                <option value="" disabled>Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
                <option value="add_new_category">+ Add Category</option>
              </select>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Stock Count (leave empty for unlimited)"
                  value={newItem.stock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              
              {/* SKU/Barcode Field */}
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="SKU / Barcode (optional)"
                  value={newItem.sku}
                  onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
              </div>

              {/* Variable Price/Weight Toggle */}
              {/* Variable Price/Weight Toggle */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="new-item-is-prompt"
                  checked={newItem.isPrompt}
                  onChange={(e) => setNewItem(prev => ({ 
                    ...prev, 
                    isPrompt: e.target.checked,
                    isVariable: false
                  }))}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <label htmlFor="new-item-is-prompt" className="text-sm font-medium text-foreground cursor-pointer select-none">
                  Variable Item (Prompt for Price & Weight on Selection)
                </label>
              </div>
              
              {/* Inventory Linking for Add - Gold+ only */}
              {hasRecipeAccess && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="w-4 h-4" />
                  <span>Inventory Linking</span>
                </div>
                <select
                  value={newItem.linkedInventoryId}
                  onChange={(e) => setNewItem(prev => ({ ...prev, linkedInventoryId: e.target.value }))}
                  className="w-full p-3 bg-secondary rounded-lg border-none"
                >
                  <option value="">-- No Inventory Link --</option>
                  {inventoryItems.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.quantity} {inv.unit} available)
                    </option>
                  ))}
                </select>
                {newItem.linkedInventoryId && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Gramage per unit (e.g., 250)"
                      value={newItem.gramagePerUnit}
                      onChange={(e) => setNewItem(prev => ({ ...prev, gramagePerUnit: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {inventoryItems.find(i => i.id === newItem.linkedInventoryId)?.unit || 'g'} per sale
                    </span>
                  </div>
                )}
              </div>
              )}
              
              <Button onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Dialog */}
      {showEditItem && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Item</h2>
              <button onClick={() => setShowEditItem(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
              <Input
                placeholder="Item Name"
                value={editItem.name}
                onChange={(e) => setEditItem(prev => ({ ...prev, name: e.target.value }))}
              />
              <MenuImageUpload imageUrl={editItem.image} onImageChange={(url) => setEditItem(prev => ({ ...prev, image: url }))} />
              <Input
                type="number"
                placeholder={editItem.isPrompt ? "Dynamic Price (Prompt on Selection)" : "Price"}
                value={editItem.isPrompt ? "" : editItem.price}
                onChange={(e) => setEditItem(prev => ({ ...prev, price: e.target.value }))}
                disabled={editItem.isPrompt}
              />
              <select
                value={editItem.category}
                onChange={(e) => {
                  if (e.target.value === 'add_new_category') {
                    setCategorySource('edit');
                    setNewCategoryName('');
                    setNewCategoryIcon('🍽️');
                    setShowAddCategory(true);
                  } else {
                    setEditItem(prev => ({ ...prev, category: e.target.value }));
                  }
                }}
                className="w-full p-3 bg-secondary rounded-lg border-none"
              >
                <option value="" disabled>Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
                <option value="add_new_category">+ Add Category</option>
              </select>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Global Stock (leave empty for unlimited)"
                  value={editItem.stock}
                  onChange={(e) => setEditItem(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              
              {/* Store-wise Stock */}
              {stores.length > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Store-wise Stock</p>
                  {stores.map(store => (
                    <div key={store.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-24 truncate">{store.name}:</span>
                      <Input
                        type="number"
                        placeholder="Stock"
                        value={editItem.storeStocks[store.id] || ''}
                        onChange={(e) => setEditItem(prev => ({
                          ...prev,
                          storeStocks: { ...prev.storeStocks, [store.id]: e.target.value }
                        }))}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Inventory Linking - Gold+ only */}
              {hasRecipeAccess && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="w-4 h-4" />
                  <span>Inventory Linking</span>
                </div>
                <select
                  value={editItem.linkedInventoryId}
                  onChange={(e) => setEditItem(prev => ({ ...prev, linkedInventoryId: e.target.value }))}
                  className="w-full p-3 bg-secondary rounded-lg border-none"
                >
                  <option value="">-- No Inventory Link --</option>
                  {inventoryItems.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.quantity} {inv.unit} available)
                    </option>
                  ))}
                </select>
                {editItem.linkedInventoryId && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Gramage per unit (e.g., 250)"
                      value={editItem.gramagePerUnit}
                      onChange={(e) => setEditItem(prev => ({ ...prev, gramagePerUnit: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {inventoryItems.find(i => i.id === editItem.linkedInventoryId)?.unit || 'g'} per sale
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Link to inventory item and specify how much is used per unit sold.
                </p>
              </div>
              )}
              {/* SKU/Barcode Field */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Barcode className="w-4 h-4" />
                  <span>SKU / Barcode</span>
                </div>
                <Input
                  placeholder="Enter SKU or barcode value"
                  value={editItem.sku}
                  onChange={(e) => setEditItem(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Used for barcode scanning. Leave empty to auto-generate from item ID.
                </p>

                {/* Variable Price/Weight Toggle */}
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="edit-item-is-prompt"
                    checked={editItem.isPrompt}
                    onChange={(e) => setEditItem(prev => ({ 
                      ...prev, 
                      isPrompt: e.target.checked,
                      isVariable: false
                    }))}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <label htmlFor="edit-item-is-prompt" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Variable Item (Prompt for Price & Weight on Selection)
                  </label>
                </div>
              </div>

              {/* Stock Alert Threshold */}
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <Input
                  type="number"
                  placeholder="Stock Alert Threshold (optional)"
                  value={editItem.stockAlertThreshold}
                  onChange={(e) => setEditItem(prev => ({ ...prev, stockAlertThreshold: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this value. Leave empty for no alert.
              </p>
              
              <p className="text-sm text-muted-foreground">
                Current stock: {editingItem.stock !== undefined ? editingItem.stock : 'Unlimited'}
                {editingItem.stockAlertThreshold !== undefined && (
                  <span className="ml-2 text-warning">• Alert at: {editingItem.stockAlertThreshold}</span>
                )}
                {hasRecipeAccess && editingItem.linkedInventoryId && (
                  <span className="ml-2 text-primary">• Linked to inventory</span>
                )}
              </p>
              <Button onClick={handleEditItem} className="w-full">
                <Edit className="w-4 h-4 mr-2" /> Update Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Low Stock Alert</p>
            <p className="text-sm text-muted-foreground">
              {lowStockItems.length} items have low stock: {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Toggle items on/off and manage your menu</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => {
              syncCategoriesFromMenu();
              toast.success('Categories synced from menu items!');
            }}
            className="pos-btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Sync Categories
          </button>
          <button 
            onClick={() => setShowBulkUpload(true)}
            className="pos-btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>
          <button 
            onClick={() => setShowAddItem(true)}
            className="pos-btn-primary px-4 py-2 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pos-input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="pos-card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-4 text-muted-foreground font-medium">Item</th>
              <th className="text-left p-4 text-muted-foreground font-medium">Category</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Price</th>
              <th className="text-center p-4 text-muted-foreground font-medium">Variations</th>
              <th className="text-center p-4 text-muted-foreground font-medium">Stock</th>
              {hasRecipeAccess && <th className="text-center p-4 text-muted-foreground font-medium">Recipe</th>}
              <th className="text-center p-4 text-muted-foreground font-medium">Status</th>
              <th className="text-center p-4 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.map((item) => {
              const category = categories.find(c => c.id === item.category);
              // Get store-specific stock if available, otherwise use global stock
              const storeStock = activeStore && item.storeStock?.[activeStore.id];
              const displayStock = storeStock !== undefined ? storeStock : item.stock;
              return (
                <tr key={item.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                        {category?.icon || '📦'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.nameHindi && (
                          <p className="text-sm text-muted-foreground">{item.nameHindi}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">
                      {category?.name || item.category}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-semibold text-primary">{formatCurrency(item.price)}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => openVariationDialog(item)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 transition-all hover:ring-2 hover:ring-primary/50",
                        item.variations && item.variations.length > 0
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Package className="w-3 h-3" />
                      {item.variations && item.variations.length > 0
                        ? `${item.variations.length} options`
                        : "Add"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    {editingStockId === item.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setTempStock(String(Math.max(0, Number(tempStock) - 1)))}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <Input
                          type="number"
                          value={tempStock}
                          onChange={(e) => setTempStock(e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          min="0"
                          autoFocus
                        />
                        <button
                          onClick={() => setTempStock(String(Number(tempStock) + 1))}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickStockUpdate(item.id, Number(tempStock))}
                          className="p-1 bg-success/20 hover:bg-success/30 rounded text-success"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingStockId(null); setTempStock(''); }}
                          className="p-1 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => startEditingStock(item)}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium min-w-[50px] hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer",
                            displayStock === undefined 
                              ? "bg-secondary text-muted-foreground"
                              : displayStock === 0 
                                ? "bg-destructive/20 text-destructive" 
                                : displayStock < 10 
                                  ? "bg-warning/20 text-warning"
                                  : "bg-success/20 text-success"
                          )}
                        >
                          {displayStock !== undefined ? displayStock : 'Set'}
                        </button>
                        {activeStore && storeStock !== undefined && (
                          <span className="text-xs text-muted-foreground">{activeStore.name}</span>
                        )}
                      </div>
                    )}
                  </td>
                  {hasRecipeAccess && (
                  <td className="p-4 text-center">
                    <button
                      onClick={() => openRecipeDialog(item)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 transition-all hover:ring-2 hover:ring-primary/50",
                        item.ingredients && item.ingredients.length > 0
                          ? "bg-primary/20 text-primary"
                          : item.linkedInventoryId
                            ? "bg-secondary text-muted-foreground"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      <UtensilsCrossed className="w-3 h-3" />
                      {item.ingredients && item.ingredients.length > 0
                        ? `${item.ingredients.length} items`
                        : item.linkedInventoryId
                          ? "1 item"
                          : "Set"}
                    </button>
                  </td>
                  )}
                  <td className="p-4">
                    <button
                      onClick={() => toggleItemAvailability(item.id)}
                      className="mx-auto flex items-center gap-2"
                    >
                      {item.isAvailable ? (
                        <>
                          <ToggleRight className="w-8 h-8 text-success" />
                          <span className="text-sm text-success">Available</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Off</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openBarcodeDialog(item)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Print Barcode"
                      >
                        <Printer className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => openEditDialog(item)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => {
                          deleteMenuItem(item.id);
                          toast.success('Item deleted');
                        }}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-muted-foreground">No items found</p>
        </div>
      )}

      {hasRecipeAccess && (
        <MenuIngredientsDialog
          open={showRecipeDialog}
          onOpenChange={setShowRecipeDialog}
          menuItem={recipeMenuItem}
          onSave={handleSaveRecipe}
        />
      )}

      <VariationManagementDialog
        open={showVariationDialog}
        onOpenChange={setShowVariationDialog}
        menuItem={variationMenuItem}
        onSave={handleSaveVariations}
      />

      <BarcodePrintDialog
        open={showBarcodeDialog}
        onOpenChange={setShowBarcodeDialog}
        menuItem={barcodeMenuItem}
      />

      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-xl w-full max-w-sm p-6 space-y-4 shadow-xl border border-border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Add Category</h3>
              <button 
                onClick={() => {
                  setShowAddCategory(false);
                  // Reset select fields to default category or empty so they aren't stuck on "add_new_category"
                  if (categorySource === 'new') {
                    setNewItem(prev => ({ ...prev, category: categories[0]?.id || 'general' }));
                  } else {
                    setEditItem(prev => ({ ...prev, category: editingItem?.category || categories[0]?.id || 'general' }));
                  }
                }} 
                className="p-2 hover:bg-secondary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Category Name (e.g., Drinks)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Input
                placeholder="Category Icon/Emoji (e.g., 🍹)"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleCreateCategory} 
              className="w-full"
              disabled={!newCategoryName.trim()}
            >
              Add Category
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
