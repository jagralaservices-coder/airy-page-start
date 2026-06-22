// PDF Menu Parser - Parses text content from PDF menu documents
// This parser handles table-formatted menu data

export interface ParsedMenuItem {
  name: string;
  nameHindi?: string;
  price: number;
  category: string;
  description?: string;
  sku?: string;
  variationName?: string;
  unit?: string; // g, ml, ltr, kg, pcs
}

export interface ParsedCategory {
  id: string;
  name: string;
  icon: string;
}

interface ParseResult {
  items: ParsedMenuItem[];
  categories: ParsedCategory[];
}

// Map category names to emojis
const categoryIcons: Record<string, string> = {
  'waffle': '🧇',
  'pancake': '🥞',
  'pan cake': '🥞',
  'bowl cake': '🍰',
  'milk shake': '🥤',
  'milkshake': '🥤',
  'sundae': '🍨',
  'mojito': '🍹',
  'stuffed fruit': '🍎',
  'fruit shots': '🍊',
  'puri khazana': '🥟',
  'dahi chaats': '🥣',
  'ragda chaats': '🥣',
  'chilly toast': '🌶️',
  'veg toast': '🥪',
  'veg grill sandwich': '🥪',
  'samosa toast': '🥟',
  'masala grill sandwich': '🥪',
  'masala toast sandwich': '🥪',
  'mayonese cheese toast': '🧀',
  'desserts': '🍨',
  'drinks': '🥤',
  'starters': '🥗',
  'main course': '🍛',
  'breads': '🫓',
  'rice': '🍚',
  'default': '🍽️'
};

// Parse markdown table format: | item | price |
function parseTableRow(line: string): { name: string; price: number } | null {
  // Match table row format: | name | price |
  const tableMatch = line.match(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|?\s*$/);
  if (tableMatch) {
    const name = tableMatch[1].trim();
    const price = parseInt(tableMatch[2], 10);
    
    // Skip header/divider rows
    if (name.includes('---') || name.toLowerCase() === 'item' || name.toLowerCase() === 'name') {
      return null;
    }
    
    if (name && !isNaN(price) && price > 0) {
      return { name, price };
    }
  }
  
  return null;
}

// Check if line is a category header (# CATEGORY NAME)
function isCategoryHeader(line: string): string | null {
  const headerMatch = line.match(/^#\s+([A-Z][A-Z\s&]+)$/);
  if (headerMatch) {
    return headerMatch[1].trim();
  }
  return null;
}

// Generate category ID from name
function generateCategoryId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Get icon for category
function getCategoryIcon(categoryName: string): string {
  const lowerName = categoryName.toLowerCase();
  
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return icon;
    }
  }
  
  return categoryIcons.default;
}

// Main parser function
export function parseMenuFromText(text: string): ParseResult {
  const lines = text.split('\n');
  const items: ParsedMenuItem[] = [];
  const categoriesMap = new Map<string, ParsedCategory>();
  
  let currentCategory = 'uncategorized';
  
  for (const line of lines) {
    // Skip empty lines and image references
    if (!line.trim() || line.includes('parsed-documents://') || line.includes('Images from page')) {
      continue;
    }
    
    // Check for category header
    const categoryName = isCategoryHeader(line);
    if (categoryName) {
      currentCategory = categoryName;
      const categoryId = generateCategoryId(categoryName);
      
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: categoryName.split(' ').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          ).join(' '),
          icon: getCategoryIcon(categoryName)
        });
      }
      continue;
    }
    
    // Try to parse table row
    const item = parseTableRow(line);
    if (item) {
      const categoryId = generateCategoryId(currentCategory);
      
      // Ensure category exists
      if (!categoriesMap.has(categoryId) && currentCategory !== 'uncategorized') {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: currentCategory.split(' ').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          ).join(' '),
          icon: getCategoryIcon(currentCategory)
        });
      }
      
      items.push({
        name: item.name,
        price: item.price,
        category: categoryId || 'uncategorized'
      });
    }
  }
  
  return {
    items,
    categories: Array.from(categoriesMap.values())
  };
}

// Parse CSV/Excel like format (comma or tab separated)
// Expected format: Name, Price, Category, SKU (optional), Variation (optional), Unit (optional)
export function parseMenuFromCSV(content: string, delimiter: string = ','): ParseResult {
  const lines = content.split('\n').filter(l => l.trim());
  const items: ParsedMenuItem[] = [];
  const categoriesSet = new Set<string>();
  
  if (lines.length === 0) {
    return { items: [], categories: [] };
  }
  
  // Detect delimiter - check first line for common delimiters
  const firstLine = lines[0];
  if (firstLine.includes('\t') && !firstLine.includes(',')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }
  
  // Check header row to determine column mapping
  let startIndex = 0;
  let columnMap: { [key: string]: number } = {
    name: 0,
    price: 1,
    category: 2,
    sku: 3,
    variation: 4,
    unit: 5
  };
  
  if (lines[0]) {
    const headerLower = lines[0].toLowerCase();
    const headerCols = lines[0].split(delimiter).map(c => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    if (headerLower.includes('name') || headerLower.includes('item') || headerLower.includes('product')) {
      startIndex = 1;
      
      // Map columns by header names
      headerCols.forEach((col, idx) => {
        if (col.includes('name') || col.includes('item') || col.includes('product')) columnMap.name = idx;
        else if (col.includes('price') || col.includes('rate') || col.includes('mrp')) columnMap.price = idx;
        else if (col.includes('category') || col.includes('group') || col.includes('type')) columnMap.category = idx;
        else if (col.includes('sku') || col.includes('code') || col.includes('barcode')) columnMap.sku = idx;
        else if (col.includes('variation') || col.includes('size') || col.includes('option') || col.includes('variant')) columnMap.variation = idx;
        else if (col.includes('unit') || col.includes('uom')) columnMap.unit = idx;
      });
    }
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted values with commas inside
    const columns: string[] = [];
    let currentCol = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        columns.push(currentCol.trim().replace(/^["']|["']$/g, ''));
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    columns.push(currentCol.trim().replace(/^["']|["']$/g, ''));
    
    if (columns.length >= 2) {
      const name = columns[columnMap.name] || '';
      const priceStr = columns[columnMap.price] || '';
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      const category = columns[columnMap.category] || 'uncategorized';
      const sku = columns[columnMap.sku] || undefined;
      const variationName = columns[columnMap.variation] || undefined;
      const unit = columns[columnMap.unit] || undefined;
      
      if (name && !isNaN(price) && price > 0) {
        items.push({
          name,
          price,
          category: generateCategoryId(category),
          sku: sku && sku.trim() ? sku.trim() : undefined,
          variationName: variationName && variationName.trim() ? variationName.trim() : undefined,
          unit: unit && unit.trim() ? unit.trim() : undefined
        });
        
        if (category && category !== 'uncategorized') {
          categoriesSet.add(category);
        }
      }
    }
  }
  
  const categories = Array.from(categoriesSet).map(name => ({
    id: generateCategoryId(name),
    name: name.split(' ').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' '),
    icon: getCategoryIcon(name)
  }));
  
  return { items, categories };
}
