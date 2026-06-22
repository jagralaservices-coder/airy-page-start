interface ReportPrintOptions {
  title: string;
  subtitle?: string;
  storeName?: string;
  dateRange?: string;
  generatedAt?: Date;
}

interface StatsData {
  label: string;
  value: string | number;
}

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

interface ListData {
  label: string;
  value: string | number;
  subtext?: string;
}

interface ReportSection {
  title?: string;
  type: 'stats' | 'table' | 'list';
  data: StatsData[] | TableData | ListData[];
}

export const printReport = (options: ReportPrintOptions, sections: ReportSection[]) => {
  const storeDetails = JSON.parse(localStorage.getItem('pos_store_details') || '{}');
  const activeStoreData = JSON.parse(localStorage.getItem('pos_active_store_data') || '{}');
  
  const storeName = options.storeName || activeStoreData.name || storeDetails.name || 'MAXORA';
  const storeAddress = activeStoreData.address || storeDetails.address || '';
  const storePhone = activeStoreData.phone || storeDetails.phone || '';
  
  const renderStats = (data: { label: string; value: string | number }[]) => `
    <div class="stats-grid">
      ${data.map(item => `
        <div class="stat-box">
          <div class="stat-label">${item.label}</div>
          <div class="stat-value">${item.value}</div>
        </div>
      `).join('')}
    </div>
  `;

  const renderTable = (data: { headers: string[]; rows: (string | number)[][] }) => `
    <table class="report-table">
      <thead>
        <tr>
          ${data.headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const renderList = (data: { label: string; value: string | number; subtext?: string }[]) => `
    <div class="list-items">
      ${data.map(item => `
        <div class="list-item">
          <div class="list-label">
            ${item.label}
            ${item.subtext ? `<span class="list-subtext">${item.subtext}</span>` : ''}
          </div>
          <div class="list-value">${item.value}</div>
        </div>
      `).join('')}
    </div>
  `;

  const renderSection = (section: ReportSection) => {
    let content = '';
    if (section.title) {
      content += `<h3 class="section-title">${section.title}</h3>`;
    }
    
    switch (section.type) {
      case 'stats':
        content += renderStats(section.data as StatsData[]);
        break;
      case 'table':
        content += renderTable(section.data as TableData);
        break;
      case 'list':
        content += renderList(section.data as ListData[]);
        break;
    }
    
    return `<div class="section">${content}</div>`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.title} - ${storeName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial Black', Arial, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          padding: 25px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #000;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }
        .store-name {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .store-info {
          font-size: 14px;
          color: #222;
          font-weight: 600;
          margin: 4px 0;
        }
        .report-title {
          font-size: 24px;
          font-weight: 900;
          margin-top: 18px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .report-subtitle {
          font-size: 15px;
          color: #333;
          margin-top: 8px;
          font-weight: 600;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 700;
          color: #222;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px dashed #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 2px solid #000;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .stat-box {
          border: 2px solid #000;
          padding: 16px;
          text-align: center;
          border-radius: 6px;
          background: #f8f8f8;
        }
        .stat-label {
          font-size: 13px;
          color: #222;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 900;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .report-table th,
        .report-table td {
          border: 2px solid #000;
          padding: 12px;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
        }
        .report-table th {
          background-color: #e8e8e8;
          font-weight: 900;
          font-size: 15px;
        }
        .report-table tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        .report-table td:last-child,
        .report-table th:last-child {
          font-weight: 800;
        }
        .list-items {
          border: 2px solid #000;
          border-radius: 6px;
          overflow: hidden;
        }
        .list-item {
          display: flex;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 2px solid #ddd;
          font-size: 15px;
        }
        .list-item:last-child {
          border-bottom: none;
        }
        .list-label {
          font-weight: 700;
        }
        .list-subtext {
          display: block;
          font-size: 12px;
          color: #444;
          font-weight: 600;
        }
        .list-value {
          font-weight: 900;
          font-size: 16px;
        }
        .footer {
          text-align: center;
          margin-top: 35px;
          padding-top: 18px;
          border-top: 3px solid #000;
          font-size: 13px;
          font-weight: 700;
          color: #333;
        }
        @media print {
          @page { size: auto; margin: 5mm; }
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            font-weight: 700 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
          }
          .store-name {
            font-size: 30px !important;
            font-weight: 900 !important;
          }
          .report-title {
            font-size: 22px !important;
            font-weight: 900 !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .stat-value {
            font-size: 22px !important;
            font-weight: 900 !important;
          }
          .report-table {
            width: 100% !important;
            table-layout: auto !important;
            font-size: 12px !important;
          }
          .report-table th,
          .report-table td {
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 8px !important;
            word-break: break-word !important;
          }
          .report-table th {
            font-weight: 900 !important;
          }
          .list-value {
            font-weight: 900 !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${storeName}</div>
        ${storeAddress ? `<div class="store-info">📍 ${storeAddress}</div>` : ''}
        ${storePhone ? `<div class="store-info">📞 ${storePhone}</div>` : ''}
        <div class="report-title">${options.title}</div>
        ${options.subtitle ? `<div class="report-subtitle">${options.subtitle}</div>` : ''}
      </div>
      
      <div class="meta-info">
        <span>Date Range: ${options.dateRange || 'All Time'}</span>
        <span>Generated: ${(options.generatedAt || new Date()).toLocaleString('en-IN')}</span>
      </div>
      
      ${sections.map(renderSection).join('')}
      
      <div class="footer">
        <p>This is a computer generated report</p>
        <p>Powered by MAXORA</p>
      </div>
    </body>
    </html>
  `;

  // Use iframe method to prevent Chrome redirect on Android
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      } catch (e) {
        document.body.removeChild(iframe);
      }
    }, 300);
  }
};

// Helper function to format currency for reports
export const formatReportCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Bill-size (80mm thermal) print for advanced reports
export const printBillReport = (title: string, dateRange: string, rows: { label: string; value: string }[]) => {
  const storeDetails = JSON.parse(localStorage.getItem('pos_store_details') || '{}');
  const activeStoreData = JSON.parse(localStorage.getItem('pos_active_store_data') || '{}');
  const storeName = activeStoreData.name || storeDetails.name || 'MAXORA';

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:12px;width:100%;max-width:100%;margin:0 auto;padding:4mm 2mm;color:#000}
.center{text-align:center}
.bold{font-weight:bold}
.store{font-size:14px;font-weight:900;margin-bottom:2px}
.title{font-size:13px;font-weight:900;margin:6px 0 2px;text-transform:uppercase}
.date{font-size:10px;margin-bottom:6px;color:#333}
.sep{border-top:1px dashed #000;margin:6px 0}
.row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
.row .lbl{max-width:60%;font-weight:600}
.row .val{font-weight:900;text-align:right}
.footer{text-align:center;font-size:9px;margin-top:8px;color:#555}
@media print{
  @page{size:auto;margin:2mm}
  body{width:100%!important;max-width:100%!important;padding:3mm}
  *{overflow-wrap:break-word!important;word-wrap:break-word!important}
}
</style></head><body>
<div class="center store">${storeName}</div>
<div class="sep"></div>
<div class="center title">${title}</div>
<div class="center date">${dateRange}</div>
<div class="sep"></div>
${rows.map(r => `<div class="row"><span class="lbl">${r.label}</span><span class="val">${r.value}</span></div>`).join('')}
<div class="sep"></div>
<div class="footer">Generated: ${new Date().toLocaleString('en-IN')}<br/>Powered by MAXORA</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:80mm;height:auto;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch {}
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
  }
};
