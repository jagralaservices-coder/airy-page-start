import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency, MenuItem, getInventory, InventoryItem, MenuItemIngredient, MenuItemVariation } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  Search, 
  ArrowLeft,
  Plus,
  ToggleLeft,
  ToggleRight,
  Package,
  X,
  Edit,
  Trash2,
  Barcode,
  Upload,
  RefreshCw,
  MoreVertical,
  Printer,
  Link2,
  AlertTriangle,
  UtensilsCrossed,
  Store,
  ChevronDown,
  Check,
  Minus,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BulkMenuUpload } from './BulkMenuUpload';
import { VariationManagementDialog } from './VariationManagementDialog';
import { BarcodePrintDialog } from './BarcodePrintDialog';
import { MenuIngredientsDialog } from './MenuIngredientsDialog';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const MobileMenuManagement: React.FC = () => {
  const navigate = useNavigate();
  const { menuItems, categories, toggleItemAvailability, activeCategory, setActiveCategory, addMenuItems, deleteMenuItem, updateMenuItem, syncCategoriesFromMenu, lowStockItems, stores, activeStore, setActiveStoreId, getStoreSales, addCategory, isStoreLogin } = usePOS();
  const { canAccess: canAccessFeature } = useSubscription();
  const hasRecipeAccess = canAccessFeature('recipeInventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  
  // Variation & Recipe dialogs
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [variationMenuItem, setVariationMenuItem] = useState<MenuItem | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [recipeMenuItem, setRecipeMenuItem] = useState<MenuItem | null>(null);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeMenuItem, setBarcodeMenuItem] = useState<MenuItem | null>(null);

  // Add/Edit form states
  const [newItem, setNewItem] = useState({ name: '', price: '', category: categories[0]?.id || '', sku: '', stock: '', linkedInventoryId: '', gramagePerUnit: '', isVariable: false, isPrompt: false });
  const [editItem, setEditItem] = useState({ name: '', price: '', category: '', sku: '', stock: '', storeStocks: {} as { [key: string]: string }, stockAlertThreshold: '', linkedInventoryId: '', gramagePerUnit: '', isVariable: false, isPrompt: false });
  
  // Category creation states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [categorySource, setCategorySource] = useState<'new' | 'edit'>('new');
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

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
      sku: newItem.sku.trim() || undefined,
      stock: newItem.stock ? Number(newItem.stock) : undefined,
      linkedInventoryId: newItem.linkedInventoryId || undefined,
      gramagePerUnit: newItem.gramagePerUnit ? Number(newItem.gramagePerUnit) : undefined,
    }]);
    if (!added) return;
    toast.success('Item added!');
    setNewItem({ name: '', price: '', category: 'starters', sku: '', stock: '', linkedInventoryId: '', gramagePerUnit: '', isVariable: false, isPrompt: false });
    setShowAddItem(false);
  };

  const handleEditItem = () => {
    if (!editingItem || !editItem.name || (!editItem.price && !editItem.isPrompt)) {
      toast.error('Please fill all fields');
      return;
    }
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
      sku: editItem.sku.trim() || undefined,
      stock: editItem.stock ? Number(editItem.stock) : undefined,
      storeStock: Object.keys(storeStock).length > 0 ? storeStock : undefined,
      stockAlertThreshold: editItem.stockAlertThreshold ? Number(editItem.stockAlertThreshold) : undefined,
      linkedInventoryId: editItem.linkedInventoryId || undefined,
      gramagePerUnit: editItem.gramagePerUnit ? Number(editItem.gramagePerUnit) : undefined,
    });
    toast.success('Item updated!');
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
      sku: item.sku || '',
      stock: item.stock !== undefined ? String(item.stock) : '',
      storeStocks,
      stockAlertThreshold: item.stockAlertThreshold !== undefined ? String(item.stockAlertThreshold) : '',
      linkedInventoryId: item.linkedInventoryId || '',
      gramagePerUnit: item.gramagePerUnit !== undefined ? String(item.gramagePerUnit) : '',
      isVariable: false,
      isPrompt: item.preparationTime === 998 || item.preparationTime === 999,
    });
    setShowEditItem(true);
  };

  const handleSaveVariations = (variations: MenuItemVariation[]) => {
    if (variationMenuItem) {
      updateMenuItem(variationMenuItem.id, { variations });
      setVariationMenuItem(null);
    }
  };

  const handleSaveRecipe = (ingredients: MenuItemIngredient[]) => {
    if (recipeMenuItem) {
      updateMenuItem(recipeMenuItem.id, { ingredients });
      setRecipeMenuItem(null);
    }
  };

  const handleBulkImport = (items: any[]) => {
    console.log('Imported items:', items);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center px-3 gap-2 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg flex-1">Menu</h1>
        
        {/* Store selector */}
        {!isStoreLogin && stores.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 px-2 rounded-lg bg-secondary text-xs font-medium flex items-center gap-1 max-w-[100px] truncate">
                <Store className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{activeStore ? activeStore.name : 'All'}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setActiveStoreId(null)}>
                <div className="flex items-center justify-between w-full">
                  <span>All Stores</span>
                  {!activeStore && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
              {stores.map(store => (
                <DropdownMenuItem key={store.id} onClick={() => setActiveStoreId(store.id)}>
                  <div className="flex items-center justify-between w-full">
                    <span>{store.name}</span>
                    {activeStore?.id === store.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 3-line More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary">
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowAddItem(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBulkUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Bulk Upload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              syncCategoriesFromMenu();
              toast.success('Categories synced!');
            }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Sync Categories
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button 
          onClick={() => setShowAddItem(true)}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <div className="mx-3 mt-2 bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-medium">Low Stock:</span> {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}
            {lowStockItems.length > 3 && ` +${lowStockItems.length - 3} more`}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="p-3 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-secondary rounded-xl text-base border-0 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto no-scrollbar bg-card border-b border-border">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0',
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0',
              activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            )}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Items List */}
      <div className="flex-1 p-3 pb-24 overflow-y-auto">
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const storeStock = activeStore && item.storeStock?.[activeStore.id];
            const displayStock = storeStock !== undefined ? storeStock : item.stock;
            const category = categories.find(c => c.id === item.category);
            const hasVariations = item.variations && item.variations.length > 0;
            const hasRecipe = (item.ingredients && item.ingredients.length > 0) || item.linkedInventoryId;
            
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-card rounded-xl border border-border p-3 transition-all',
                  !item.isAvailable && 'opacity-60'
                )}
              >
                {/* Row 1: Name, price, toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category?.icon || '🍽️'}</span>
                      <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-primary font-bold">{formatCurrency(item.price)}</span>
                      {displayStock !== undefined && (
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full flex items-center gap-1',
                          displayStock === 0 ? 'bg-destructive/10 text-destructive' :
                          displayStock < 10 ? 'bg-warning/10 text-warning' :
                          'bg-success/10 text-success'
                        )}>
                          <Package className="w-3 h-3" />
                          {displayStock}
                        </span>
                      )}
                      {hasVariations && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {item.variations!.length} var
                        </span>
                      )}
                      {hasRecipeAccess && hasRecipe && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                          <UtensilsCrossed className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle + Per-item menu */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleItemAvailability(item.id)}
                      className={cn(
                        'w-11 h-9 rounded-lg flex items-center justify-center transition-colors touch-manipulation',
                        item.isAvailable ? 'bg-success/10' : 'bg-destructive/10'
                      )}
                    >
                      {item.isAvailable ? (
                        <ToggleRight className="w-6 h-6 text-success" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-destructive" />
                      )}
                    </button>

                    {/* Per-item action menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary touch-manipulation">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setVariationMenuItem(item); setShowVariationDialog(true); }}>
                          <Package className="w-4 h-4 mr-2" /> Variations
                          {hasVariations && <span className="ml-auto text-xs text-primary">{item.variations!.length}</span>}
                        </DropdownMenuItem>
                        {hasRecipeAccess && (
                        <DropdownMenuItem onClick={() => { setRecipeMenuItem(item); setShowRecipeDialog(true); }}>
                          <UtensilsCrossed className="w-4 h-4 mr-2" /> Recipe
                        </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setBarcodeMenuItem(item); setShowBarcodeDialog(true); }}>
                          <Printer className="w-4 h-4 mr-2" /> Print Barcode
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            deleteMenuItem(item.id);
                            toast.success('Item deleted');
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <span className="text-5xl mb-3">🔍</span>
            <p>No items found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-2 text-primary font-medium text-sm">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Upload Dialog */}
      <BulkMenuUpload
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onItemsImported={handleBulkImport}
      />

      {/* Add Item Modal - Full featured */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowAddItem(false)}>
          <div className="bg-card rounded-t-2xl w-full p-5 space-y-3 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Item</h2>
              <button onClick={() => setShowAddItem(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Input placeholder="Item Name" value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))} className="h-12 text-base" />
            <Input 
              type="number" 
              placeholder={newItem.isPrompt ? "Dynamic Price (Prompt on Selection)" : "Price"} 
              value={newItem.isPrompt ? "" : newItem.price} 
              onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))} 
              className="h-12 text-base" 
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
              className="w-full p-3 h-12 bg-secondary rounded-xl border-none text-base"
            >
              <option value="" disabled>Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
              <option value="add_new_category">+ Add Category</option>
            </select>
            
            {/* Stock */}
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Input type="number" placeholder="Stock (empty = unlimited)" value={newItem.stock} onChange={(e) => setNewItem(prev => ({ ...prev, stock: e.target.value }))} className="h-12 text-base" />
            </div>

            {/* SKU */}
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Input placeholder="SKU / Barcode (optional)" value={newItem.sku} onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))} className="h-12 text-base font-mono" />
            </div>

            {/* Inventory Linking - only for Gold+ */}
            {hasRecipeAccess && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="w-4 h-4" /> Inventory Linking
              </div>
              <select value={newItem.linkedInventoryId} onChange={(e) => setNewItem(prev => ({ ...prev, linkedInventoryId: e.target.value }))} className="w-full p-3 bg-secondary rounded-xl border-none text-sm">
                <option value="">-- No Inventory Link --</option>
                {inventoryItems.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit})</option>
                ))}
              </select>
              {newItem.linkedInventoryId && (
                <Input type="number" placeholder="Gramage per unit (e.g., 250)" value={newItem.gramagePerUnit} onChange={(e) => setNewItem(prev => ({ ...prev, gramagePerUnit: e.target.value }))} className="h-10 text-sm" />
              )}
            </div>
            )}

            {/* Variable Price/Weight Toggle */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="mob-new-item-is-prompt"
                checked={newItem.isPrompt}
                onChange={(e) => setNewItem(prev => ({ 
                  ...prev, 
                  isPrompt: e.target.checked,
                  isVariable: false,
                  price: e.target.checked ? '0' : prev.price
                }))}
                className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="mob-new-item-is-prompt" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Variable Item (Prompt for Price & Weight on Selection)
              </label>
            </div>

            <Button onClick={handleAddItem} className="w-full h-12 text-base">
              <Plus className="w-5 h-5 mr-2" /> Add Item
            </Button>
          </div>
        </div>
      )}

      {/* Edit Item Modal - Full featured */}
      {showEditItem && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowEditItem(false)}>
          <div className="bg-card rounded-t-2xl w-full p-5 space-y-3 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Item</h2>
              <button onClick={() => setShowEditItem(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Input placeholder="Item Name" value={editItem.name} onChange={(e) => setEditItem(prev => ({ ...prev, name: e.target.value }))} className="h-12 text-base" />
            <Input 
              type="number" 
              placeholder={editItem.isPrompt ? "Dynamic Price (Prompt on Selection)" : "Price"} 
              value={editItem.isPrompt ? "" : editItem.price} 
              onChange={(e) => setEditItem(prev => ({ ...prev, price: e.target.value }))} 
              className="h-12 text-base" 
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
              className="w-full p-3 h-12 bg-secondary rounded-xl border-none text-base"
            >
              <option value="" disabled>Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
              <option value="add_new_category">+ Add Category</option>
            </select>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Input type="number" placeholder="Global Stock (empty = unlimited)" value={editItem.stock} onChange={(e) => setEditItem(prev => ({ ...prev, stock: e.target.value }))} className="h-12 text-base" />
            </div>

            {/* Store-wise Stock */}
            {stores.length > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-sm font-medium">Store-wise Stock</p>
                {stores.map(store => (
                  <div key={store.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 truncate">{store.name}:</span>
                    <Input type="number" placeholder="Stock" value={editItem.storeStocks[store.id] || ''} onChange={(e) => setEditItem(prev => ({
                      ...prev, storeStocks: { ...prev.storeStocks, [store.id]: e.target.value }
                    }))} className="flex-1 h-10 text-sm" />
                  </div>
                ))}
              </div>
            )}

            {/* SKU */}
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Input placeholder="SKU / Barcode (optional)" value={editItem.sku} onChange={(e) => setEditItem(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))} className="h-12 text-base font-mono" />
            </div>

            {/* Inventory Linking - only for Gold+ */}
            {hasRecipeAccess && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="w-4 h-4" /> Inventory Linking
              </div>
              <select value={editItem.linkedInventoryId} onChange={(e) => setEditItem(prev => ({ ...prev, linkedInventoryId: e.target.value }))} className="w-full p-3 bg-secondary rounded-xl border-none text-sm">
                <option value="">-- No Inventory Link --</option>
                {inventoryItems.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit})</option>
                ))}
              </select>
              {editItem.linkedInventoryId && (
                <Input type="number" placeholder="Gramage per unit" value={editItem.gramagePerUnit} onChange={(e) => setEditItem(prev => ({ ...prev, gramagePerUnit: e.target.value }))} className="h-10 text-sm" />
              )}
            </div>
            )}

            {/* Variable Price/Weight Toggle */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="mob-edit-item-is-prompt"
                checked={editItem.isPrompt}
                onChange={(e) => setEditItem(prev => ({ 
                  ...prev, 
                  isPrompt: e.target.checked,
                  isVariable: false,
                  price: e.target.checked ? '0' : prev.price
                }))}
                className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="mob-edit-item-is-prompt" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Variable Item (Prompt for Price & Weight on Selection)
              </label>
            </div>

            {/* Stock Alert */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <Input type="number" placeholder="Stock Alert Threshold" value={editItem.stockAlertThreshold} onChange={(e) => setEditItem(prev => ({ ...prev, stockAlertThreshold: e.target.value }))} className="h-10 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  deleteMenuItem(editingItem.id);
                  toast.success('Item deleted');
                  setShowEditItem(false);
                }}
                className="flex-1 h-12"
              >
                <Trash2 className="w-5 h-5 mr-2" /> Delete
              </Button>
              <Button onClick={handleEditItem} className="flex-1 h-12">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
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

export default MobileMenuManagement;
