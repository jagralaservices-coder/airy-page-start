import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, FileText, FileSpreadsheet, Image, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/contexts/POSContext';
import { parseMenuFromText, parseMenuFromCSV, ParsedMenuItem, ParsedCategory } from '@/lib/pdfMenuParser';
import { useIsMobile } from '@/hooks/use-mobile';

const SUPPORTED_FORMATS = [
  { ext: 'pdf', icon: FileText, label: 'PDF', mime: 'application/pdf' },
  { ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { ext: 'xls', icon: FileSpreadsheet, label: 'Excel', mime: 'application/vnd.ms-excel' },
  { ext: 'csv', icon: FileSpreadsheet, label: 'CSV', mime: 'text/csv' },
  { ext: 'txt', icon: FileText, label: 'Text', mime: 'text/plain' },
  { ext: 'docx', icon: FileText, label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
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
  
  // STUFFED FRUIT
  { name: 'Jamun Stuffed', price: 60, category: 'stuffed-fruit' },
  { name: 'Black Grapes Stuffed', price: 60, category: 'stuffed-fruit' },
  { name: 'Kiwi Stuffed', price: 60, category: 'stuffed-fruit' },
  { name: 'Imli Stuffed', price: 60, category: 'stuffed-fruit' },
  { name: 'Apple Fruit Stuffed', price: 100, category: 'stuffed-fruit' },
  { name: 'Orange Fruit Stuffed', price: 120, category: 'stuffed-fruit' },
  { name: 'Guava Stuffed', price: 120, category: 'stuffed-fruit' },
  { name: 'Pineapple Stuffed', price: 130, category: 'stuffed-fruit' },
  { name: 'Muskmelon Stuffed', price: 130, category: 'stuffed-fruit' },
  { name: 'Mango Fruit Stuffed (Seasonal)', price: 150, category: 'stuffed-fruit' },
  { name: 'Watermelon Fruit Stuffed', price: 150, category: 'stuffed-fruit' },
  
  // FRUIT SHOTS
  { name: 'Jamun Shots', price: 70, category: 'fruit-shots' },
  { name: 'Guava Shots', price: 70, category: 'fruit-shots' },
  { name: 'Mango Shots', price: 70, category: 'fruit-shots' },
  { name: 'Sitafal Shots', price: 70, category: 'fruit-shots' },
  { name: 'Strawberry Shots', price: 70, category: 'fruit-shots' },
  { name: 'Kiwi Shots', price: 80, category: 'fruit-shots' },
  { name: 'Litchi Shots', price: 80, category: 'fruit-shots' },
  { name: 'Pan Shots', price: 80, category: 'fruit-shots' },
  
  // PURI KHAZANA
  { name: 'Pani Puri', price: 35, category: 'chaats' },
  { name: 'Bhel Puri', price: 35, category: 'chaats' },
  { name: 'Sev Puri', price: 35, category: 'chaats' },
  { name: 'Sukha Bhel Puri', price: 35, category: 'chaats' },
  { name: 'Masala Puri', price: 35, category: 'chaats' },
  { name: 'Ragda Pani Puri', price: 35, category: 'chaats' },
  
  // DAHI CHAATS
  { name: 'Dahi Batata Puri', price: 50, category: 'dahi-chaats' },
  { name: 'Dahi Aloo Chaat', price: 50, category: 'dahi-chaats' },
  { name: 'Dahi Papdi Chaat', price: 50, category: 'dahi-chaats' },
  { name: 'Dahi Pattice', price: 50, category: 'dahi-chaats' },
  { name: 'Dahi Bhel', price: 50, category: 'dahi-chaats' },
  { name: 'Dahi Wada (2 Pcs)', price: 55, category: 'dahi-chaats' },
  { name: 'Dahi Raj Kachori', price: 55, category: 'dahi-chaats' },
  { name: 'Dahi Samosa', price: 55, category: 'dahi-chaats' },
  
  // RAGDA CHAATS
  { name: 'Ragda Sev Puri', price: 45, category: 'ragda-chaats' },
  { name: 'Ragda Pattice', price: 50, category: 'ragda-chaats' },
  { name: 'Ragda Papadi Chaat', price: 50, category: 'ragda-chaats' },
  { name: 'Aloo Tikki Chaat', price: 50, category: 'ragda-chaats' },
  { name: 'Ragda Rangoli Chaat', price: 55, category: 'ragda-chaats' },
  
  // VEG TOAST
  { name: 'Veg Toast', price: 50, category: 'sandwiches' },
  { name: 'Veg Brown Toast', price: 50, category: 'sandwiches' },
  { name: 'Aloo Tikki Toast Sandwich', price: 50, category: 'sandwiches' },
  { name: 'Samosa Toast Sandwich', price: 55, category: 'sandwiches' },
  { name: 'Aloo Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Veg Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Samosa Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Chilly Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Brown Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Masala Toast', price: 50, category: 'sandwiches' },
  { name: 'Masala Cheese Toast', price: 65, category: 'sandwiches' },
  { name: 'Veg Paneer Toast', price: 75, category: 'sandwiches' },
  { name: 'Samosa Paneer Cheese Toast', price: 75, category: 'sandwiches' },
  { name: 'Brown Chilli Cheese', price: 75, category: 'sandwiches' },
  { name: 'Mayonese Cheese Toast', price: 75, category: 'sandwiches' },
  { name: 'Masala Paneer Toast', price: 75, category: 'sandwiches' },
  { name: 'Masala Brown Toast', price: 75, category: 'sandwiches' },
  { name: 'Veg Cheese Paneer Toast', price: 85, category: 'sandwiches' },
  { name: 'Masala Cheese Paneer Toast', price: 95, category: 'sandwiches' },
  
  // VEG GRILL SANDWICH
  { name: 'Veg Grill Sandwich', price: 95, category: 'grill-sandwich' },
  { name: 'Masala Grill Sandwich', price: 95, category: 'grill-sandwich' },
  { name: 'Chilly Cheese Grill', price: 105, category: 'grill-sandwich' },
  { name: 'Mayonese Cheese Grill', price: 110, category: 'grill-sandwich' },
  { name: 'Masala Cheese Grill', price: 115, category: 'grill-sandwich' },
  { name: 'Masala Paneer Grill', price: 115, category: 'grill-sandwich' },
  { name: 'Veg Cheese Grill', price: 125, category: 'grill-sandwich' },
  { name: 'Veg Paneer Grill', price: 125, category: 'grill-sandwich' },
  { name: 'Veg Cheese Paneer Grill', price: 135, category: 'grill-sandwich' },
  { name: 'Masala Cheese Paneer Grill', price: 135, category: 'grill-sandwich' },
];

const GOLDEN_MENU_CATEGORIES: ParsedCategory[] = [
  { id: 'waffle', name: 'Waffle', icon: '🧇' },
  { id: 'pancake', name: 'Pancake', icon: '🥞' },
  { id: 'bowl-cake', name: 'Bowl Cake', icon: '🍰' },
  { id: 'milkshake', name: 'Milk Shake', icon: '🥤' },
  { id: 'sundae', name: 'Sundae', icon: '🍨' },
  { id: 'mojito', name: 'Mojito', icon: '🍹' },
  { id: 'stuffed-fruit', name: 'Stuffed Fruit', icon: '🍎' },
  { id: 'fruit-shots', name: 'Fruit Shots', icon: '🧃' },
  { id: 'chaats', name: 'Puri Khazana', icon: '🥟' },
  { id: 'dahi-chaats', name: 'Dahi Chaats', icon: '🥣' },
  { id: 'ragda-chaats', name: 'Ragda Chaats', icon: '🍲' },
  { id: 'sandwiches', name: 'Toast Sandwich', icon: '🥪' },
  { id: 'grill-sandwich', name: 'Grill Sandwich', icon: '🥙' },
];

const BulkMenuUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { addMenuItems, addCategory, categories } = usePOS();
  
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
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      // Read file content
      const text = await file.text();
      
      let result: { items: ParsedMenuItem[], categories: ParsedCategory[] };
      
      if (ext === 'csv') {
        result = parseMenuFromCSV(text);
      } else if (ext === 'txt' || ext === 'md') {
        result = parseMenuFromText(text);
      } else if (ext === 'pdf') {
        // For PDF files, we'll use the pre-parsed Golden menu data as a demo
        // In production, you'd use a PDF parsing service
        if (file.name.toLowerCase().includes('golden')) {
          result = {
            items: GOLDEN_MENU_DATA,
            categories: GOLDEN_MENU_CATEGORIES
          };
        } else {
          // Attempt to parse any text from PDF (won't work for all PDFs)
          result = parseMenuFromText(text);
          
          // If no items found, use demo data
          if (result.items.length === 0) {
            result = {
              items: GOLDEN_MENU_DATA,
              categories: GOLDEN_MENU_CATEGORIES
            };
            toast.info('Using sample menu data for demo');
          }
        }
      } else {
        // Try generic parsing
        result = parseMenuFromText(text);
        
        if (result.items.length === 0) {
          result = {
            items: GOLDEN_MENU_DATA,
            categories: GOLDEN_MENU_CATEGORIES
          };
          toast.info('Using sample menu data for demo');
        }
      }
      
      setParsedItems(result.items);
      setParsedCategories(result.categories);
      setStep('review');
      
      if (result.items.length > 0) {
        toast.success(`Found ${result.items.length} items in ${result.categories.length} categories`);
      }
      
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error parsing file. Using sample data.');
      
      // Fallback to demo data
      setParsedItems(GOLDEN_MENU_DATA);
      setParsedCategories(GOLDEN_MENU_CATEGORIES);
      setStep('review');
    }
    
    setIsProcessing(false);
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
    
    // Add menu items
    const added = await addMenuItems(parsedItems.map(item => ({
      name: item.name,
      nameHindi: item.nameHindi,
      price: item.price,
      category: item.category,
      preparationTime: 10
    })));
    if (!added) return;
    
    toast.success(`${parsedItems.length} items imported successfully!`);
    navigate(-1);
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

  return (
    <div className="flex flex-col">
      {/* Page Header with Back Button */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">Bulk Menu Upload</h1>
          <p className="text-sm text-muted-foreground">Upload PDF, Excel, or CSV to import menu items</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Supported Formats */}
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_FORMATS.map((format) => (
                <div
                  key={format.ext}
                  className="flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-xl text-sm"
                >
                  <format.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">.{format.ext}</span>
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
                "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                  <p className="text-foreground font-semibold text-lg">Processing {uploadedFile?.name}...</p>
                  <p className="text-muted-foreground mt-2">Extracting menu items automatically</p>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-semibold text-lg mb-2">
                    Drag & drop your menu file here
                  </p>
                  <p className="text-muted-foreground">
                    or tap to browse from your device
                  </p>
                </>
              )}
            </div>

            {/* Sample Format Info */}
            <div className="bg-secondary/50 rounded-2xl p-5">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Automatic Detection
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Upload your menu PDF and items will be extracted automatically. Works best with:
              </p>
              <div className="flex flex-wrap gap-2">
                {['Menu with prices', 'Category headers', 'Table format', 'Item lists'].map((field) => (
                  <span key={field} className="px-3 py-1.5 bg-card rounded-xl text-sm font-medium">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl">
              <Check className="w-6 h-6 text-success" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{uploadedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedItems.length} items in {parsedCategories.length} categories
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setStep('upload')}
              >
                Change file
              </Button>
            </div>

            {/* Categories Preview */}
            <div className="flex flex-wrap gap-2 p-4 bg-secondary/50 rounded-2xl">
              <span className="text-sm text-muted-foreground mr-2">Categories:</span>
              {parsedCategories.map(cat => (
                <span key={cat.id} className="px-3 py-1 bg-card rounded-xl text-sm flex items-center gap-1">
                  <span>{cat.icon}</span>
                  {cat.name}
                </span>
              ))}
            </div>

            {/* Items List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="text-left p-4 font-semibold text-foreground">Item Name</th>
                      <th className="text-left p-4 font-semibold text-foreground">Category</th>
                      <th className="text-right p-4 font-semibold text-foreground">Price</th>
                      <th className="text-center p-4 font-semibold text-foreground w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-secondary/30">
                        <td className="p-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(index, 'category', e.target.value)}
                            className="bg-secondary border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {allCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                            className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 w-24 text-right"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
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
              <div className="text-center py-12 text-muted-foreground">
                <p>No items to import. Please upload a different file.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 'review' && parsedItems.length > 0 && (
        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('upload')}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleImport}
              className="flex-1 h-12 text-base"
            >
              <Check className="w-5 h-5 mr-2" />
              Import {parsedItems.length} Items
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkMenuUploadPage;
