import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Trash2,
  Plus,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { getInventory, setInventory, InventoryItem, generateId } from '@/lib/store';
import { convertToBaseUnit, getBaseUnit } from '@/lib/inventoryUtils';

interface ParsedInventoryItem {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  costUnit: string;
  minStock: number;
  isNew?: boolean;
}

interface BulkInventoryUploadProps {
  onBack: () => void;
  onComplete?: () => void;
}

const SUPPORTED_FORMATS = [
  { ext: 'csv', icon: FileSpreadsheet, label: 'CSV', mime: 'text/csv' },
  { ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { ext: 'txt', icon: FileText, label: 'Text', mime: 'text/plain' },
];

const SAMPLE_CSV = `name,quantity,unit,cost_per_unit,cost_unit,min_stock
Rice,50,kg,45,kg,10
Sugar,25,kg,50,kg,5
Cooking Oil,20,ltr,150,ltr,5
Salt,10,kg,25,kg,2
Tomatoes,15,kg,40,kg,5
Onions,20,kg,35,kg,5
Milk,30,ltr,55,ltr,10
Flour,40,kg,40,kg,10`;

export const BulkInventoryUpload: React.FC<BulkInventoryUploadProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedInventoryItem[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inventory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded!');
  };

  const parseCSV = (content: string): ParsedInventoryItem[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const items: ParsedInventoryItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue;

      const item: ParsedInventoryItem = {
        name: values[headers.indexOf('name')] || values[0] || '',
        quantity: parseFloat(values[headers.indexOf('quantity')] || values[1]) || 0,
        unit: values[headers.indexOf('unit')] || values[2] || 'kg',
        costPerUnit: parseFloat(values[headers.indexOf('cost_per_unit')] || values[3]) || 0,
        costUnit: values[headers.indexOf('cost_unit')] || values[4] || 'kg',
        minStock: parseFloat(values[headers.indexOf('min_stock')] || values[5]) || 10,
        isNew: true
      };

      if (item.name) {
        items.push(item);
      }
    }

    return items;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const items = parseCSV(text);

      if (items.length === 0) {
        toast.error('No valid items found in file');
        setIsProcessing(false);
        return;
      }

      // Check existing inventory for duplicates
      const existingInventory = getInventory();
      const itemsWithStatus = items.map(item => ({
        ...item,
        isNew: !existingInventory.some(
          inv => inv.name.toLowerCase() === item.name.toLowerCase()
        )
      }));

      setParsedItems(itemsWithStatus);
      setStep('review');
      toast.success(`Found ${items.length} items in file`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedInventoryItem, value: string | number) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const addEmptyItem = () => {
    setParsedItems(prev => [...prev, {
      name: '',
      quantity: 0,
      unit: 'kg',
      costPerUnit: 0,
      costUnit: 'kg',
      minStock: 10,
      isNew: true
    }]);
  };

  const handleImport = () => {
    const validItems = parsedItems.filter(item => item.name.trim() !== '');
    
    if (validItems.length === 0) {
      toast.error('No valid items to import');
      return;
    }

    const existingInventory = getInventory();
    let addedCount = 0;
    let updatedCount = 0;

    validItems.forEach(item => {
      const quantityInBase = convertToBaseUnit(item.quantity, item.unit);
      const baseUnit = getBaseUnit(item.unit);
      const minStockInBase = convertToBaseUnit(item.minStock, item.unit);

      const existingItem = existingInventory.find(
        inv => inv.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingItem) {
        // Update existing item - add quantity
        existingItem.quantity += quantityInBase;
        existingItem.costPerUnit = item.costPerUnit;
        existingItem.costUnit = item.costUnit;
        existingItem.lastUpdated = new Date();
        updatedCount++;
      } else {
        // Add new item
        const newItem: InventoryItem = {
          id: generateId(),
          name: item.name,
          quantity: quantityInBase,
          unit: baseUnit,
          costPerUnit: item.costPerUnit,
          costUnit: item.costUnit,
          minStock: minStockInBase,
          lastUpdated: new Date()
        };
        existingInventory.push(newItem);
        addedCount++;
      }
    });

    setInventory(existingInventory);
    setStep('complete');
    toast.success(`Imported ${addedCount} new items, updated ${updatedCount} existing items`);
    
    if (onComplete) {
      setTimeout(onComplete, 1500);
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold">Import Complete!</h2>
          <p className="text-muted-foreground">Inventory items have been imported successfully.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Bulk Inventory Upload</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Supported Formats */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Supported Formats</h3>
              <div className="flex flex-wrap gap-3">
                {SUPPORTED_FORMATS.map((format) => (
                  <div key={format.ext} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
                    <format.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{format.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Download */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Download Sample Template</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download a sample CSV file to see the expected format for inventory data.
              </p>
              <Button variant="outline" onClick={downloadSampleCSV}>
                <Download className="w-4 h-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>

            {/* CSV Format Guide */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-2">CSV Format</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Your CSV should have these columns (in order):
              </p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <p className="text-primary">name, quantity, unit, cost_per_unit, cost_unit, min_stock</p>
                <p className="text-muted-foreground mt-1">Rice, 50, kg, 45, kg, 10</p>
                <p className="text-muted-foreground">Sugar, 25, kg, 50, kg, 5</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Units: kg, g, ltr, ml, pcs
              </p>
            </div>

            {/* Upload Area */}
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                isProcessing ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              
              {isProcessing ? (
                <div className="space-y-3">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <p className="text-muted-foreground">Processing {fileName}...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">CSV, Excel, or Text files</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Review Items ({parsedItems.length})</h2>
                <p className="text-sm text-muted-foreground">
                  Review and edit items before importing
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addEmptyItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Items Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Qty</th>
                      <th className="text-left p-3 text-sm font-medium">Unit</th>
                      <th className="text-left p-3 text-sm font-medium">Cost/Unit</th>
                      <th className="text-left p-3 text-sm font-medium">Min Stock</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="p-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            className="h-9"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-9 w-20"
                          />
                        </td>
                        <td className="p-2">
                          <Select value={item.unit} onValueChange={(v) => updateItem(index, 'unit', v)}>
                            <SelectTrigger className="h-9 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">KG</SelectItem>
                              <SelectItem value="g">G</SelectItem>
                              <SelectItem value="ltr">LTR</SelectItem>
                              <SelectItem value="ml">ML</SelectItem>
                              <SelectItem value="pcs">PCS</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.costPerUnit}
                            onChange={(e) => updateItem(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                            className="h-9 w-24"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.minStock}
                            onChange={(e) => updateItem(index, 'minStock', parseFloat(e.target.value) || 0)}
                            className="h-9 w-20"
                          />
                        </td>
                        <td className="p-2">
                          {item.isNew ? (
                            <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">New</span>
                          ) : (
                            <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">Update</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={parsedItems.length === 0}>
                <Check className="w-4 h-4 mr-2" />
                Import {parsedItems.length} Items
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
