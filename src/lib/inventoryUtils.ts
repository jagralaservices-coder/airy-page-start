// Inventory utility functions for unit conversion and display

// Base unit mapping - everything is stored in base units (g, ml, pcs)
export const BASE_UNITS = {
  weight: 'g',    // grams
  volume: 'ml',   // milliliters
  count: 'pcs'    // pieces
};

// Unit categories
export const UNIT_CATEGORIES: Record<string, 'weight' | 'volume' | 'count'> = {
  'kg': 'weight',
  'g': 'weight',
  'gm': 'weight',
  'ltr': 'volume',
  'l': 'volume',
  'ml': 'volume',
  'pcs': 'count',
  'box': 'count',
  'packet': 'count',
};

// Conversion factors to base unit
export const CONVERSION_TO_BASE: Record<string, number> = {
  'kg': 1000,     // 1 kg = 1000 g
  'g': 1,
  'gm': 1,
  'ltr': 1000,    // 1 ltr = 1000 ml
  'l': 1000,
  'ml': 1,
  'pcs': 1,
  'box': 1,
  'packet': 1,
};

/**
 * Convert quantity to base unit (g, ml, pcs)
 */
export const convertToBaseUnit = (quantity: number, unit: string | undefined | null): number => {
  if (!unit) return quantity; // Return as-is if no unit provided
  const factor = CONVERSION_TO_BASE[unit.toLowerCase()] || 1;
  return quantity * factor;
};

/**
 * Get the base unit for a given unit
 */
export const getBaseUnit = (unit: string): string => {
  const category = UNIT_CATEGORIES[unit.toLowerCase()];
  if (category === 'weight') return 'g';
  if (category === 'volume') return 'ml';
  return 'pcs';
};

/**
 * Format quantity in human-readable format - ALWAYS shows both units
 * e.g., 1350g -> "1 KG 350 GM", 2780ml -> "2 LTR 780 ML", 1000g -> "1 KG 0 GM"
 * Supports negative values: -500g -> "-0 KG 500 GM" or displayed with minus prefix
 */
export const formatQuantityDisplay = (quantityInBase: number, unit: string): string => {
  const category = UNIT_CATEGORIES[unit.toLowerCase()] || 'count';
  const isNegative = quantityInBase < 0;
  const absQuantity = Math.abs(quantityInBase);
  const prefix = isNegative ? '-' : '';
  
  if (category === 'weight') {
    const kg = Math.floor(absQuantity / 1000);
    const gm = Math.round(absQuantity % 1000);
    
    // Always show both KG and GM
    return `${prefix}${kg} KG ${gm} GM`;
  }
  
  if (category === 'volume') {
    const ltr = Math.floor(absQuantity / 1000);
    const ml = Math.round(absQuantity % 1000);
    
    // Always show both LTR and ML
    return `${prefix}${ltr} LTR ${ml} ML`;
  }
  
  // For count units (pcs, box, etc.)
  return `${prefix}${Math.round(absQuantity)} ${unit.toUpperCase()}`;
};

/**
 * Get the display unit category label
 */
export const getUnitCategoryLabel = (unit: string): string => {
  const category = UNIT_CATEGORIES[unit.toLowerCase()];
  if (category === 'weight') return 'Weight (KG/GM)';
  if (category === 'volume') return 'Volume (LTR/ML)';
  return 'Count';
};

/**
 * Parse user input and convert to base unit
 * Supports formats like "1.5 kg", "500 gm", "1 kg 350 gm", etc.
 */
export const parseQuantityInput = (input: string, defaultUnit: string = 'g'): { quantity: number; unit: string } => {
  const cleaned = input.trim().toLowerCase();
  
  // Check for combined format like "1 kg 350 gm"
  const combinedMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|ltr|l)\s*(\d+(?:\.\d+)?)\s*(gm?|ml)/i);
  if (combinedMatch) {
    const major = parseFloat(combinedMatch[1]);
    const majorUnit = combinedMatch[2];
    const minor = parseFloat(combinedMatch[3]);
    
    const majorInBase = convertToBaseUnit(major, majorUnit);
    const totalInBase = majorInBase + minor;
    
    return { quantity: totalInBase, unit: getBaseUnit(majorUnit) };
  }
  
  // Check for simple format like "1.5 kg" or "500 gm"
  const simpleMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|gm?|ltr?|ml|pcs|box|packet)?/i);
  if (simpleMatch) {
    const value = parseFloat(simpleMatch[1]);
    const unit = simpleMatch[2] || defaultUnit;
    
    return { 
      quantity: convertToBaseUnit(value, unit), 
      unit: getBaseUnit(unit) 
    };
  }
  
  return { quantity: 0, unit: defaultUnit };
};
