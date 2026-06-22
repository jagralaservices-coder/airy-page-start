// Advanced Report Export Utilities - CSV & PDF generation

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

/**
 * Export data as CSV file
 */
export const exportToCSV = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  fileName: string
) => {
  if (data.length === 0) return;

  const headers = columns.map(c => `"${c.header}"`).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : (value ?? '');
      return `"${String(formatted).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${fileName}.csv`);
};

/**
 * Export data as printable HTML (for PDF via browser print)
 */
export const exportToPrintableHTML = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  title: string,
  metadata?: { storeName?: string; dateRange?: string; generatedAt?: string }
) => {
  const headerRow = columns.map(c => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;font-size:12px;text-align:left;">${c.header}</th>`).join('');
  const bodyRows = data.map(row =>
    `<tr>${columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : (value ?? '');
      return `<td style="border:1px solid #ddd;padding:6px;font-size:11px;">${formatted}</td>`;
    }).join('')}</tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>${title}</title>
    <style>
      @media print { body { margin: 0; } @page { margin: 1cm; } }
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      .header { margin-bottom: 16px; }
      .header h1 { font-size: 18px; margin: 0; }
      .meta { font-size: 11px; color: #666; margin-top: 4px; }
      .summary { margin-top: 12px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 12px; }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        ${metadata?.storeName ? `<div class="meta">Store: ${metadata.storeName}</div>` : ''}
        ${metadata?.dateRange ? `<div class="meta">Period: ${metadata.dateRange}</div>` : ''}
        <div class="meta">Generated: ${metadata?.generatedAt || new Date().toLocaleString()}</div>
        <div class="summary">Total Records: ${data.length}</div>
      </div>
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
};

/**
 * Export summary card data
 */
export const exportSummaryToCSV = (
  summaryData: Record<string, string | number>[],
  fileName: string
) => {
  if (summaryData.length === 0) return;
  const keys = Object.keys(summaryData[0]);
  const headers = keys.map(k => `"${k}"`).join(',');
  const rows = summaryData.map(row =>
    keys.map(k => `"${row[k] ?? ''}"`).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${fileName}.csv`);
};

// Currency formatter
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Download helper
const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
