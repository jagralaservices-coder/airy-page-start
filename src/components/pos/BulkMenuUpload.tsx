import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, FileSpreadsheet, Image, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePOS } from '@/contexts/POSContext';
import { parseMenuFromText, parseMenuFromCSV, ParsedMenuItem as ParserMenuItem, ParsedCategory as ParserCategory } from '@/lib/pdfMenuParser';

interface BulkMenuUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsImported: (items: ParsedMenuItem[]) => void;
}

interface ParsedMenuItem {
  name: string;
  nameHindi?: string;
  price: number;
  category: string;
  description?: string;
  sku?: string;
  variationName?: string; // For sub-variations like "500ml", "1L"
  parentItem?: string; // Parent item name if this is a variation
  unit?: string; // g, ml, ltr, kg, pcs
}

interface ParsedCategory {
  id: string;
  name: string;
  icon: string;
}

const SUPPORTED_FORMATS = [
  { ext: 'pdf', icon: FileText, label: 'PDF', mime: 'application/pdf' },
  { ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { ext: 'xls', icon: FileSpreadsheet, label: 'Excel', mime: 'application/vnd.ms-excel' },
  { ext: 'csv', icon: FileSpreadsheet, label: 'CSV', mime: 'text/csv' },
  { ext: 'docx', icon: FileText, label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'doc', icon: FileText, label: 'Word', mime: 'application/msword' },
  { ext: 'jpg', icon: Image, label: 'Image', mime: 'image/jpeg' },
  { ext: 'png', icon: Image, label: 'Image', mime: 'image/png' },
];

// Complete menu data parsed from Golden Desserts PDF
const GOLDEN_MENU_DATA: ParsedMenuItem[] = [
  // WAFFLE
  { name: 'Honey Butter Waffle', price: 100, category: 'waffle' },
  { name: 'Maple Butter Waffle', price: 100, category: 'waffle' },
  { name: 'Belgian Milk Waffle', price: 120, category: 'waffle' },
  { name: 'Belgian Dark Waffle', price: 130, category: 'waffle' },
  { name: 'Almond Affair Waffle', price: 150, category: 'waffle' },
  { name: 'Butterscotch Waffle', price: 150, category: 'waffle' },
  { name: 'Kitkat Crunch Waffle', price: 150, category: 'waffle' },
  { name: 'Naughty Nutella Waffle', price: 160, category: 'waffle' },
  { name: 'Kiki & Oreo Waffle', price: 160, category: 'waffle' },
  { name: 'Blueberry Waffle', price: 160, category: 'waffle' },
  { name: 'Strawberry Waffle', price: 160, category: 'waffle' },
  { name: 'Mango Waffle', price: 160, category: 'waffle' },
  { name: 'Dark & White Fantasy Waffle', price: 160, category: 'waffle' },
  { name: 'Overload Milk Waffle', price: 170, category: 'waffle' },
  { name: 'Overload Dark Waffle', price: 170, category: 'waffle' },
  { name: 'Triple Chocolate Waffle', price: 170, category: 'waffle' },
  
  // PANCAKE
  { name: 'Honey Butter Pancake', price: 80, category: 'pancake' },
  { name: 'Maple Butter Pancake', price: 80, category: 'pancake' },
  { name: 'Belgian Milk Pancake', price: 100, category: 'pancake' },
  { name: 'Belgian Dark Pancake', price: 120, category: 'pancake' },
  { name: 'Almond Affair Pancake', price: 120, category: 'pancake' },
  { name: 'Butterscotch Pancake', price: 130, category: 'pancake' },
  { name: 'Kitkat Crunch Pancake', price: 140, category: 'pancake' },
  { name: 'Naughty Nutella Pancake', price: 150, category: 'pancake' },
  { name: 'Overload Milk Pancake', price: 140, category: 'pancake' },
  { name: 'Overload Dark Pancake', price: 140, category: 'pancake' },
  { name: 'Dark & White Fantasy Pancake', price: 140, category: 'pancake' },
  { name: 'Kiki & Oreo Pancake', price: 140, category: 'pancake' },
  { name: 'Triple Chocolate Pancake', price: 150, category: 'pancake' },
  { name: 'Blueberry Pancake', price: 150, category: 'pancake' },
  { name: 'Strawberry Pancake', price: 150, category: 'pancake' },
  { name: 'Mango Pancake', price: 150, category: 'pancake' },
  { name: 'Lotus Biscoff Pancake', price: 180, category: 'pancake' },
  { name: 'Choco Lovely Pancake', price: 180, category: 'pancake' },
  
  // BOWL CAKE
  { name: 'Milky Mania Bowl Cake', price: 180, category: 'bowl-cake' },
  { name: 'Dark Temptation Bowl Cake', price: 200, category: 'bowl-cake' },
  { name: 'Kitkat Crunch Bowl Cake', price: 220, category: 'bowl-cake' },
  { name: 'Kiki & Oreo Bowl Cake', price: 220, category: 'bowl-cake' },
  { name: 'Triple Madness Bowl Cake', price: 250, category: 'bowl-cake' },
  { name: 'Naughty Nutella Bowl Cake', price: 250, category: 'bowl-cake' },
  { name: 'Blue Berry Bowl Cake', price: 250, category: 'bowl-cake' },
  { name: 'Strawberry Bowl Cake', price: 250, category: 'bowl-cake' },
  { name: 'Mango Bowl Cake', price: 250, category: 'bowl-cake' },
  { name: 'Kunafa Pistachio Bowl Cake', price: 280, category: 'bowl-cake' },
  { name: 'Almond Fantasy Bowl Cake', price: 280, category: 'bowl-cake' },
  { name: 'Ferrero Rocher Bowl Cake', price: 300, category: 'bowl-cake' },
  
  // MILK SHAKE
  { name: 'Chocolate Shake', price: 100, category: 'milkshake' },
  { name: 'Kitkat Shake', price: 120, category: 'milkshake' },
  { name: 'Oreo Shake', price: 120, category: 'milkshake' },
  { name: 'Mango Shake', price: 120, category: 'milkshake' },
  { name: 'Classic Cold Coffee', price: 120, category: 'milkshake' },
  { name: 'Salted Caramel Shake', price: 140, category: 'milkshake' },
  { name: 'Berry Blast Shake', price: 150, category: 'milkshake' },
  { name: 'Coffee Mocha', price: 150, category: 'milkshake' },
  { name: 'Chocolate Brownie Shake', price: 150, category: 'milkshake' },
  { name: 'Sitafal Shake', price: 150, category: 'milkshake' },
  { name: 'Naughty Nutella Shake', price: 180, category: 'milkshake' },
  { name: 'Nutty Chocolate Shake', price: 200, category: 'milkshake' },
  
  // SUNDAE
  { name: 'Classic Sundae', price: 130, category: 'sundae' },
  { name: 'Overload Sundae', price: 150, category: 'sundae' },
  { name: 'Triple Sundae', price: 160, category: 'sundae' },
  { name: 'Chocolate Lovely Sundae', price: 180, category: 'sundae' },
  
  // MOJITO
  { name: 'Virgin Mojito', price: 80, category: 'mojito' },
  { name: 'Green Apple Mojito', price: 100, category: 'mojito' },
  { name: 'Mint Mojito', price: 100, category: 'mojito' },
  { name: 'Passion Fruit Mojito', price: 120, category: 'mojito' },
  { name: 'Aam Panna Mojito', price: 120, category: 'mojito' },
  { name: 'Watermelon Mojito', price: 120, category: 'mojito' },
  
  // CHAATS
  { name: 'Pani Puri', price: 35, category: 'chaats' },
  { name: 'Bhel Puri', price: 35, category: 'chaats' },
  { name: 'Sev Puri', price: 35, category: 'chaats' },
  { name: 'Dahi Batata Puri', price: 50, category: 'chaats' },
  { name: 'Dahi Papdi Chaat', price: 50, category: 'chaats' },
  { name: 'Aloo Tikki Chaat', price: 50, category: 'chaats' },
  
  // SANDWICHES
  { name: 'Veg Toast', price: 50, category: 'sandwiches' },
  { name: 'Veg Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Veg Paneer Toast', price: 75, category: 'sandwiches' },
  { name: 'Chilly Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Chilly Cheese Grill', price: 105, category: 'sandwiches' },
  { name: 'Veg Grill Sandwich', price: 95, category: 'sandwiches' },
  { name: 'Veg Cheese Grill', price: 125, category: 'sandwiches' },
  { name: 'Masala Grill Sandwich', price: 95, category: 'sandwiches' },
  { name: 'Masala Cheese Grill', price: 115, category: 'sandwiches' },
];

const GOLDEN_MENU_CATEGORIES: ParsedCategory[] = [
  { id: 'waffle', name: 'Waffle', icon: '🧇' },
  { id: 'pancake', name: 'Pancake', icon: '🥞' },
  { id: 'bowl-cake', name: 'Bowl Cake', icon: '🍰' },
  { id: 'milkshake', name: 'Milk Shake', icon: '🥤' },
  { id: 'sundae', name: 'Sundae', icon: '🍨' },
  { id: 'mojito', name: 'Mojito', icon: '🍹' },
  { id: 'chaats', name: 'Chaats', icon: '🥟' },
  { id: 'sandwiches', name: 'Sandwiches', icon: '🥪' },
];

export const BulkMenuUpload: React.FC<BulkMenuUploadProps> = ({
  isOpen,
  onClose,
  onItemsImported
}) => {
  const { categories, addCategory, addMenuItems, syncCategoriesFromMenu } = usePOS();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      let items: ParsedMenuItem[] = [];
      let categories: ParsedCategory[] = [];

      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const result = parseMenuFromCSV(text);
        items = result.items;
        categories = result.categories;
      } else if (fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // For Excel files, we need to read as CSV or use a library
        toast.error('Excel files require conversion. Please save as CSV and upload again.');
        setIsProcessing(false);
        setUploadedFile(null);
        return;
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // For PDF, read as text and parse
        // Since we can't parse PDFs directly in browser without library,
        // we'll ask user to copy-paste text or use image OCR
        toast.info('PDF detected! For best results, please copy-paste menu text or upload a clear image.');
        
        // Try to extract text from PDF using FileReader
        const text = await file.text();
        if (text && text.trim().length > 50) {
          const result = parseMenuFromText(text);
          items = result.items;
          categories = result.categories;
        }
        
        if (items.length === 0) {
          toast.warning('Could not extract items from PDF. Try uploading a clear image or CSV file.');
          setIsProcessing(false);
          setUploadedFile(null);
          return;
        }
      } else if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
        // For images, we'll use simple OCR-style text extraction
        toast.info('Image detected! Processing menu image...');
        
        // For now, show manual entry option since client-side OCR is limited
        toast.warning('Image OCR not available. Please upload a CSV or copy-paste menu items.');
        setIsProcessing(false);
        setUploadedFile(null);
        return;
      } else if (fileType.includes('word') || fileName.match(/\.(doc|docx)$/)) {
        // Word documents
        const text = await file.text();
        const result = parseMenuFromText(text);
        items = result.items;
        categories = result.categories;
      } else {
        // Try as plain text
        const text = await file.text();
        const result = parseMenuFromText(text);
        items = result.items;
        categories = result.categories;
      }

      if (items.length === 0) {
        toast.error('No menu items found! Please check file format.');
        setIsProcessing(false);
        setUploadedFile(null);
        return;
      }

      setParsedItems(items);
      setParsedCategories(categories);
      setIsProcessing(false);
      setStep('review');
      
      toast.success(`Found ${items.length} items in ${categories.length} categories`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please try a different format.');
      setIsProcessing(false);
      setUploadedFile(null);
    }
  };

  const handleImport = async () => {
    // Add new categories first
    parsedCategories.forEach(cat => {
      if (!categories.some(c => c.id === cat.id)) {
        addCategory({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          nameHindi: undefined
        });
      }
    });
    
    // Group items by name+category to detect variations
    const itemGroups = new Map<string, ParsedMenuItem[]>();
    
    parsedItems.forEach(item => {
      const key = `${item.name.toLowerCase().trim()}|${item.category}`;
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });

    // Process each group
    const itemsToAdd: Array<{
      name: string;
      nameHindi?: string;
      price: number;
      category: string;
      preparationTime: number;
      sku?: string;
    }> = [];

    const variationsToAdd: Array<{
      menuItemName: string;
      category: string;
      variations: Array<{
        name: string;
        sku?: string;
        price: number;
        unit?: string;
      }>;
    }> = [];

    itemGroups.forEach((items, key) => {
      if (items.length === 1 && !items[0].variationName) {
        // Single item without variation - add normally
        itemsToAdd.push({
          name: items[0].name,
          nameHindi: items[0].nameHindi,
          price: items[0].price,
          category: items[0].category,
          preparationTime: 10,
          sku: items[0].sku
        });
      } else {
        // Multiple items with same name or has variation - create variations
        const baseItem = items[0];
        const minPrice = Math.min(...items.map(i => i.price));
        
        itemsToAdd.push({
          name: baseItem.name,
          nameHindi: baseItem.nameHindi,
          price: minPrice, // Base price is the minimum
          category: baseItem.category,
          preparationTime: 10,
          sku: baseItem.sku
        });

        variationsToAdd.push({
          menuItemName: baseItem.name,
          category: baseItem.category,
          variations: items.map((item, idx) => ({
            name: item.variationName || `Option ${idx + 1}`,
            sku: item.sku,
            price: item.price,
            unit: item.unit
          }))
        });
      }
    });

    // Add menu items first
    const added = await addMenuItems(itemsToAdd);
    if (!added) return;

    // Add variations to database after items are created
    // Get the newly created menu items to link variations
    const storeId = localStorage.getItem('owner_selected_store_id') || JSON.parse(localStorage.getItem('pos_active_store_data') || '{}')?.id;
    
    if (storeId && variationsToAdd.length > 0) {
      // Import supabase and add variations
      const { supabase } = await import('@/integrations/supabase/client');
      
      for (const group of variationsToAdd) {
        // Find the menu item we just created
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('id')
          .eq('store_id', storeId)
          .eq('name', group.menuItemName)
          .eq('category', group.category)
          .single();

        if (menuItem) {
          // Add variations
          const variationsData = group.variations.map((v, idx) => ({
            menu_item_id: menuItem.id,
            name: v.name,
            sku: v.sku || null,
            price: v.price,
            unit: v.unit || 'pcs',
            sort_order: idx,
            is_available: true
          }));

          await supabase.from('menu_item_variations').insert(variationsData);
        }
      }
    }
    
    // Sync categories from menu items
    setTimeout(() => {
      syncCategoriesFromMenu();
    }, 100);
    
    onItemsImported(parsedItems);
    handleClose();
    
    // Force page refresh to show new items
    window.location.reload();
  };

  const handleClose = () => {
    setUploadedFile(null);
    setParsedItems([]);
    setParsedCategories([]);
    setStep('upload');
    setIsProcessing(false);
    onClose();
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ParsedMenuItem, value: string | number) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const allCategories = [...new Set([...categories.map(c => ({ id: c.id, name: c.name })), ...parsedCategories.map(c => ({ id: c.id, name: c.name }))])];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-card rounded-xl w-full max-w-[800px] max-h-[85vh] shadow-2xl animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Bulk Menu Upload</h2>
            <p className="text-sm text-muted-foreground">Upload a file to import menu items</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Supported Formats */}
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_FORMATS.map((format) => (
                  <div
                    key={format.ext}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-sm"
                  >
                    <format.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">.{format.ext}</span>
                  </div>
                ))}
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-foreground font-medium">Processing {uploadedFile?.name}...</p>
                    <p className="text-sm text-muted-foreground mt-1">Extracting menu items</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </>
                )}
              </div>

              {/* Sample Format Info */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Recommended: CSV Format
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a CSV file with columns: Name, Price, Category, SKU (optional), Variation (optional)
                </p>
                <div className="bg-card p-3 rounded text-xs font-mono text-muted-foreground space-y-1">
                  <div className="text-primary">Name,Price,Category,SKU,Variation</div>
                  <div>Butter Chicken,350,Main Course,SKU001,</div>
                  <div>Water,10,Beverages,WAT500,500ml</div>
                  <div>Water,20,Beverages,WAT1L,1 Ltr</div>
                  <div>Paneer Tikka,280,Starters,PT001,</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Items with same name & category but different Variation will be grouped as sub-options
                </p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                <Check className="w-5 h-5 text-success" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{uploadedFile?.name}</p>
                  <p className="text-sm text-muted-foreground">{parsedItems.length} items in {parsedCategories.length} categories</p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-sm text-primary hover:underline"
                >
                  Change file
                </button>
              </div>

              {/* Categories Preview */}
              <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm text-muted-foreground mr-2">Categories:</span>
                {parsedCategories.map(cat => (
                  <span key={cat.id} className="px-2 py-1 bg-card rounded text-xs flex items-center gap-1">
                    <span>{cat.icon}</span>
                    {cat.name}
                  </span>
                ))}
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-[40vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">SKU</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Variation</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Price</th>
                        <th className="text-center p-3 font-medium text-muted-foreground w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedItems.map((item, index) => (
                        <tr key={index} className="hover:bg-secondary/30">
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-full"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              className="bg-secondary border-none rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {allCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.sku || ''}
                              onChange={(e) => updateItem(index, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-20 text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.variationName || ''}
                              onChange={(e) => updateItem(index, 'variationName', e.target.value)}
                              placeholder="e.g., 500ml"
                              className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-20 text-sm"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                              className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-20 text-right"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1 hover:bg-destructive/10 rounded text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsedItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items to import. Please upload a different file.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          {step === 'review' && parsedItems.length > 0 && (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Import {parsedItems.length} Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};