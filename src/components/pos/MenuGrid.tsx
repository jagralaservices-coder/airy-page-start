import React, { useState, forwardRef, useMemo } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { MenuItem, MenuItemVariation } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Clock, Layers, Plus, Search, X, ChevronRight, PackagePlus } from 'lucide-react';
import { VariationSelectorSheet } from './VariationSelectorSheet';
import { PromptPriceWeightDialog } from './PromptPriceWeightDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'packet', 'plate', 'glass', 'bottle'];
// Theme-based card design - no more multi-color

export const MenuGrid = forwardRef<HTMLDivElement>((_, ref) => {
  const { menuItems, categories, activeCategory, setActiveCategory, addToCart } = usePOS();
  const { t, formatCurrency } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForVariation, setSelectedItemForVariation] = useState<MenuItem | null>(null);
  const [variationSheetOpen, setVariationSheetOpen] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [matchingCategories, setMatchingCategories] = useState<string[]>([]);
  const [promptItem, setPromptItem] = useState<MenuItem | null>(null);
  
  // Other item quick-add state
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherPrice, setOtherPrice] = useState('');
  const [otherQty, setOtherQty] = useState('1');
  const [otherUnit, setOtherUnit] = useState('pcs');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable) return;
    if (item.variations && item.variations.length > 0) {
      setSelectedItemForVariation(item);
      setVariationSheetOpen(true);
    } else if (item.preparationTime === 998 || item.preparationTime === 999) {
      setPromptItem(item);
    } else {
      addToCart(item);
    }
  };

  const handleVariationSelect = (item: MenuItem, variation?: MenuItemVariation, quantity: number = 1) => {
    const itemToAdd = variation ? {
      ...item,
      price: variation.price,
      name: `${item.name} (${variation.name})`,
      sku: variation.sku || item.sku,
    } : item;

    if (item.preparationTime === 998 || item.preparationTime === 999) {
      setPromptItem(itemToAdd);
    } else {
      for (let i = 0; i < quantity; i++) {
        addToCart(itemToAdd);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      const lowerSearch = value.toLowerCase();
      const matchingCats: string[] = [];
      menuItems.forEach(item => {
        if (item.name.toLowerCase().includes(lowerSearch)) {
          if (!matchingCats.includes(item.category)) {
            matchingCats.push(item.category);
          }
        }
      });
      if (matchingCats.length > 1 && activeCategory === 'all') {
        setMatchingCategories(matchingCats);
        setShowCategorySelector(true);
      } else {
        setShowCategorySelector(false);
      }
    } else {
      setShowCategorySelector(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setShowCategorySelector(false);
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameHindi?.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const activeCategories = useMemo(() => {
    return categories.filter(cat => menuItems.some(item => item.category === cat.id));
  }, [categories, menuItems]);

  const validateOtherForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!otherName.trim()) errors.name = 'Product name is required';
    if (!otherPrice || parseFloat(otherPrice) <= 0) errors.price = 'Price must be greater than 0';
    if (!otherQty || parseFloat(otherQty) <= 0) errors.qty = 'Quantity must be greater than 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOther = () => {
    if (!validateOtherForm()) return;
    const qty = Math.max(1, Math.floor(parseFloat(otherQty)));
    const customItem: MenuItem = {
      id: `other_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${otherName.trim()} (${otherUnit})`,
      price: parseFloat(otherPrice),
      category: activeCategory !== 'all' ? activeCategory : 'Other',
      isAvailable: true,
    };
    for (let i = 0; i < qty; i++) {
      addToCart(customItem);
    }
    toast.success(`${otherName.trim()} x${qty} added to cart`);
    setOtherName('');
    setOtherPrice('');
    setOtherQty('1');
    setOtherUnit('pcs');
    setFormErrors({});
    setShowOtherForm(false);
  };

  const openOtherForm = () => {
    setFormErrors({});
    setOtherName('');
    setOtherPrice('');
    setOtherQty('1');
    setOtherUnit('pcs');
    setShowOtherForm(true);
  };

  return (
    <div ref={ref} className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-sm pos-input"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowCategorySelector(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {showCategorySelector && matchingCategories.length > 1 && (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2 font-medium">
              "{searchQuery}" found in multiple categories. Select one:
            </p>
            <div className="flex flex-wrap gap-2">
              {matchingCategories.map((catId) => {
                const cat = categories.find(c => c.id === catId);
                return (
                  <button
                    key={catId}
                    onClick={() => handleCategorySelect(catId)}
                    className="px-4 py-2 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                  >
                    {cat?.icon || '📦'} {cat?.name || catId}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setActiveCategory('all'); setShowCategorySelector(false); }}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all',
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          )}
        >
          All Items
        </button>
        {activeCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setShowCategorySelector(false); }}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            )}
          >
            <span className="text-base">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {/* Others Button */}
          <button
            onClick={openOtherForm}
            className="rounded-xl border-2 border-dashed border-primary/30 hover:border-primary bg-card p-2 flex flex-col items-center justify-center gap-1 transition-all hover:shadow-md active:scale-95 min-h-[80px]"
          >
            <PackagePlus className="w-6 h-6 text-primary" />
            <span className="text-[10px] font-bold text-primary leading-tight text-center">+ Others</span>
          </button>

          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={!item.isAvailable}
              className={cn(
                'rounded-[20px] bg-[#14152e] border-0 text-left relative overflow-hidden transition-all duration-150 hover:shadow-lg hover:ring-2 hover:ring-primary/40 active:scale-95 flex flex-col w-full h-full min-h-[140px]',
                !item.isAvailable && 'opacity-40 cursor-not-allowed grayscale'
              )}
            >
              {/* Product Image */}
              <div className="w-full aspect-[4/3] bg-[#1f2146] relative overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">🍽️</div>
                )}
                {item.variations && item.variations.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-[#1d1f3e]/90 text-primary-foreground rounded-full p-1">
                    <Layers className="w-2.5 h-2.5" />
                  </div>
                )}
                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <span className="text-[9px] font-semibold text-muted-foreground">Unavailable</span>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="p-2.5 flex flex-col flex-1 gap-1 relative w-full">
                <h3 className="font-bold text-[10px] leading-tight break-words text-white pr-4">
                  {item.name}
                </h3>
                {item.nameHindi && (
                  <p className="text-[9px] text-muted-foreground/80 break-words leading-tight pr-4">{item.nameHindi}</p>
                )}
                {searchQuery && activeCategory === 'all' && (
                  <span className="inline-block mt-0.5 px-1 py-0.5 rounded-full text-[8px] font-medium bg-[#212349] text-muted-foreground w-max">
                    {item.category}
                  </span>
                )}
                
                <div className="flex items-end justify-between mt-auto pt-1">
                  <span className="font-extrabold text-[10px] text-[#8f98ff]">
                    {item.variations && item.variations.length > 0
                      ? `${formatCurrency(Math.min(item.price || Infinity, ...item.variations.map(v => v.price)))}+`
                      : formatCurrency(item.price)}
                  </span>
                </div>

                {/* Plus button inside Info Area */}
                {item.isAvailable && (
                  <div className="absolute bottom-2.5 right-2.5 w-5 h-5 bg-[#212349] hover:bg-primary rounded-full flex items-center justify-center shadow-md transition-colors">
                    <Plus className="w-3.5 h-3.5 text-[#6f78f6] hover:text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <span className="text-6xl mb-4">🔍</span>
            <p>No items found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-2 text-primary hover:underline text-sm">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Others Quick-Add Dialog */}
      <Dialog open={showOtherForm} onOpenChange={setShowOtherForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Add Custom Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="other-name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="other-name"
                placeholder="Enter product name"
                value={otherName}
                onChange={(e) => { setOtherName(e.target.value); setFormErrors(prev => ({ ...prev, name: '' })); }}
                autoFocus
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="other-price">Rate / Price <span className="text-destructive">*</span></Label>
                <Input
                  id="other-price"
                  type="number"
                  placeholder="0.00"
                  value={otherPrice}
                  onChange={(e) => { setOtherPrice(e.target.value); setFormErrors(prev => ({ ...prev, price: '' })); }}
                  min="0"
                  step="0.01"
                />
                {formErrors.price && <p className="text-xs text-destructive">{formErrors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="other-qty">Quantity <span className="text-destructive">*</span></Label>
                <Input
                  id="other-qty"
                  type="number"
                  placeholder="1"
                  value={otherQty}
                  onChange={(e) => { setOtherQty(e.target.value); setFormErrors(prev => ({ ...prev, qty: '' })); }}
                  min="1"
                  step="1"
                />
                {formErrors.qty && <p className="text-xs text-destructive">{formErrors.qty}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={otherUnit} onValueChange={setOtherUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" size="lg" onClick={handleAddOther}>
              <Plus className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variation Selector Sheet */}
      <VariationSelectorSheet
        item={selectedItemForVariation}
        isOpen={variationSheetOpen}
        onClose={() => { setVariationSheetOpen(false); setSelectedItemForVariation(null); }}
        onSelect={handleVariationSelect}
      />

      {/* Prompt Price & Weight Dialog */}
      <PromptPriceWeightDialog
        open={!!promptItem}
        onOpenChange={(open) => !open && setPromptItem(null)}
        item={promptItem}
        onAdd={(item, price, weight) => addToCart(item, price, weight)}
      />
    </div>
  );
});

MenuGrid.displayName = 'MenuGrid';
