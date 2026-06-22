import React, { useMemo, useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Search, X, Plus, Minus, Clock, ScanBarcode, Layers, ShoppingCart, Banknote, CreditCard, Smartphone, Scissors, Trash2, PackagePlus } from 'lucide-react';
import { MobileCart } from '@/components/pos/MobileCart';
import { BarcodeButton } from '@/components/pos/BarcodeButton';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { LinkBarcodeDialog } from '@/components/pos/LinkBarcodeDialog';
import { VariationSelectorSheet } from '@/components/pos/VariationSelectorSheet';
import { CustomItemDialog } from '@/components/pos/CustomItemDialog';
import { PromptPriceWeightDialog } from '@/components/pos/PromptPriceWeightDialog';
import { MenuItem, MenuItemVariation } from '@/lib/store';

const MobilePOSPage: React.FC = () => {
  const { menuItems, categories, activeCategory, setActiveCategory, addToCart, cart, updateCartQuantity, clearCart, cartSubtotal } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForVariation, setSelectedItemForVariation] = useState<MenuItem | null>(null);
  const [variationSheetOpen, setVariationSheetOpen] = useState(false);
  const [showInlineCart, setShowInlineCart] = useState(false);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [promptItem, setPromptItem] = useState<MenuItem | null>(null);

  const { unmatchedCode, clearUnmatchedCode } = useBarcodeScanner();

  const handleItemClick = (item: MenuItem) => {
    if (item.id.startsWith('others-')) {
      setShowCustomItemDialog(true);
      return;
    }

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

  const handleAddCustomItem = (item: MenuItem, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(item);
    }
  };

  const filteredItems = useMemo(() => {
    const baseProducts = menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameHindi?.includes(searchQuery) ||
        (item.sku && String(item.sku).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    const othersItem: MenuItem = {
      id: `others-${activeCategory}`,
      name: 'Others',
      price: 0,
      category: activeCategory === 'all' ? 'others' : activeCategory,
      isAvailable: true,
    };

    const products = [othersItem, ...baseProducts];
    console.log('Product List:', products);
    return products;
  }, [menuItems, activeCategory, searchQuery]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeCategories = useMemo(() => {
    return categories.filter(cat => menuItems.some(item => item.category === cat.id));
  }, [categories, menuItems]);

  const getStockInfo = (item: MenuItem) => {
    const stock = item.stock;
    if (stock === null || stock === undefined) return null;
    if (stock <= 5) return { label: `${stock} left`, isLow: true };
    if (stock <= 20) return { label: `${stock} left`, isLow: false };
    return { label: `${stock} left`, isLow: false };
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Search Bar */}
        <div className="p-3 bg-card border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Check exact SKU or barcode match globally first (case-insensitive, trimmed)
                    const exactMatch = menuItems.find(item => 
                      (item.sku && String(item.sku).toLowerCase() === searchQuery.toLowerCase().trim()) ||
                      (item.barcode && String(item.barcode).toLowerCase() === searchQuery.toLowerCase().trim())
                    );
                    const match = exactMatch || filteredItems.find(item => !item.id.startsWith('others-') && item.isAvailable);
                    if (match) {
                      handleItemClick(match);
                      setSearchQuery('');
                      (e.target as HTMLInputElement).focus();
                    }
                  }
                }}
                className="w-full pl-12 pr-10 py-3.5 bg-secondary rounded-xl text-base border-0 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <BarcodeButton
              size="default"
              className="h-[52px] w-[52px] rounded-xl flex-shrink-0"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-3 py-3 overflow-x-auto no-scrollbar bg-card border-b border-border">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2',
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            <span>🍽️</span> All
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 p-3 overflow-y-auto" style={{ paddingBottom: cart.length > 0 ? (showInlineCart ? '380px' : '100px') : '16px' }}>
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const stockInfo = getStockInfo(item);
              const isOthers = item.id.startsWith('others-');

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={!item.isAvailable}
                  className={cn(
                    'rounded-[28px] bg-[#14152e] border-0 text-left relative overflow-hidden transition-all duration-150 hover:shadow-lg hover:ring-2 hover:ring-primary/40 active:scale-[0.97] flex flex-col w-full h-full min-h-[220px]',
                    !item.isAvailable && 'opacity-40 cursor-not-allowed grayscale',
                    isOthers && 'border-2 border-dashed border-primary/30 bg-transparent hover:border-primary h-full min-h-[188px]'
                  )}
                >
                  {isOthers ? (
                    <div className="flex h-full min-h-[188px] flex-col items-center justify-center gap-2 p-3 text-center w-full">
                      <PackagePlus className="w-10 h-10 text-primary" />
                      <h3 className="font-semibold text-primary text-sm">Others</h3>
                      <p className="text-xs text-muted-foreground">Add custom item</p>
                    </div>
                  ) : (
                    <>
                      {/* Image Area */}
                      <div className="w-full aspect-[4/3] bg-[#1f2146] relative overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🍽️</div>
                        )}

                        {/* Low Stock Badge */}
                        {stockInfo?.isLow && (
                          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-md">
                            Low Stock
                          </div>
                        )}

                        {/* Variation indicator */}
                        {item.variations && item.variations.length > 0 && (
                          <div className="absolute top-2 right-2 bg-[#1d1f3e]/90 text-primary-foreground rounded-full p-1.5">
                            <Layers className="w-3 h-3" />
                          </div>
                        )}

                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="p-3.5 flex flex-col flex-1 gap-1 relative w-full">
                        <h3 className="font-semibold text-white text-sm break-words leading-tight pr-6">{item.name}</h3>
                        {item.nameHindi && (
                          <p className="text-xs text-muted-foreground/80 break-words leading-tight pr-6 mt-0.5">{item.nameHindi}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-2">
                          {item.variations && item.variations.length > 0 ? (
                            <span className="text-[#8f98ff] font-bold text-base">
                              {formatCurrency(Math.min(item.price || Infinity, ...item.variations.map(v => v.price)))}+
                            </span>
                          ) : (
                            <span className="text-[#8f98ff] font-bold text-base">{formatCurrency(item.price)}</span>
                          )}
                          {stockInfo && (
                            <span className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full bg-secondary',
                              stockInfo.isLow ? 'text-destructive bg-destructive/10' : 'text-muted-foreground'
                            )}>
                              {stockInfo.label}
                            </span>
                          )}
                          {!stockInfo && item.preparationTime && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {item.preparationTime}m
                            </span>
                          )}
                        </div>

                        {/* Add button overlay in bottom right of card text area */}
                        {item.isAvailable && (
                          <div className="absolute bottom-3.5 right-3.5 w-7 h-7 bg-[#212349] hover:bg-primary rounded-full flex items-center justify-center shadow-md transition-colors">
                            <Plus className="w-4 h-4 text-[#6f78f6] hover:text-white" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <span className="text-6xl mb-4">🔍</span>
              <p>No items found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-primary font-medium text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Persistent Bottom Cart Sheet */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-2xl">
            {/* Drag Handle */}
            <button
              onClick={() => setShowInlineCart(!showInlineCart)}
              className="w-full flex justify-center pt-2 pb-1"
            >
              <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
            </button>

            {/* Cart Header */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-lg">Current Order</h3>
                <span className="text-muted-foreground text-sm">({itemCount} items)</span>
              </div>
              <button
                onClick={() => clearCart()}
                className="text-destructive text-sm font-semibold uppercase"
              >
                Clear
              </button>
            </div>

            {/* Expandable Cart Items */}
            {showInlineCart && (
              <div className="px-4 max-h-[200px] overflow-y-auto space-y-3 pb-3 border-t border-border pt-3">
                {cart.map((item) => (
                  <div key={item.cartItemId || item.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                      <p className="text-muted-foreground text-xs">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId || item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Persistent Bottom Cart Button */}
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* Charge Button */}
              <button
                onClick={() => setCartOpen(true)}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-between px-6 shadow-lg shadow-primary/20"
              >
                <span>Charge</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Full Cart Drawer for checkout - opens on Charge click */}
        <MobileCart isOpen={cartOpen} onOpenChange={setCartOpen} />
      </div>

      <CustomItemDialog
        open={showCustomItemDialog}
        onOpenChange={setShowCustomItemDialog}
        onAdd={handleAddCustomItem}
        categoryId={activeCategory}
      />

      <VariationSelectorSheet
        item={selectedItemForVariation}
        isOpen={variationSheetOpen}
        onClose={() => {
          setVariationSheetOpen(false);
          setSelectedItemForVariation(null);
        }}
        onSelect={handleVariationSelect}
      />

      <LinkBarcodeDialog scannedCode={unmatchedCode} onClose={clearUnmatchedCode} />

      <PromptPriceWeightDialog
        open={!!promptItem}
        onOpenChange={(open) => !open && setPromptItem(null)}
        item={promptItem}
        onAdd={(item, price, weight) => addToCart(item, price, weight)}
      />
    </>
  );
};

export default MobilePOSPage;
