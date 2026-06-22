const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '../src/pages/reports');

const importToAdd = `import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';\n`;

const effectCode = `  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  useEffect(() => {
    if (dateRange?.from) {
      setTimeRange('custom');
    } else if (timeRange === 'custom') {
      setTimeRange('today');
    }
  }, [dateRange]);\n`;

const tabsRegex = /<Tabs value=\{timeRange\}[\s\S]*?<\/Tabs>/g;
const replacementUI = `<div className="flex items-center gap-2">
            <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => { setTimeRange('today'); setDateRange(undefined); }} className="h-9">Today</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>`;

const files = fs.readdirSync(reportsDir);

files.forEach(filename => {
  if (!filename.endsWith('.tsx')) return;
  const filePath = path.join(reportsDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('DatePickerWithRange')) return;

  if (content.includes('import React, { useState }')) {
    content = content.replace('import React, { useState }', 'import React, { useState, useEffect }');
  } else if (content.includes('import React, { useState,')) {
    content = content.replace('import React, { useState,', 'import React, { useState, useEffect,');
  }

  content = content.replace('import { useAnalytics', importToAdd + 'import { useAnalytics');

  content = content.replace(
    "const [timeRange, setTimeRange] = useState<TimeRange>('today');\n",
    "const [timeRange, setTimeRange] = useState<TimeRange>('today');\n" + effectCode
  );

  content = content.replace(/useAnalytics\(timeRange\)/g, "useAnalytics(timeRange, dateRange)");

  content = content.replace(tabsRegex, replacementUI);

  const labelRegex = /const dateRangeLabel = timeRange === 'today' \? 'Today' : timeRange === 'week' \? 'This Week' : 'This Month';/g;
  const newLabel = `const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? \`\${dateRange.from.toLocaleDateString()} - \${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}\`
      : timeRange === 'today' ? 'Today' : 'Today';`;
  
  content = content.replace(labelRegex, newLabel);

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Done updating reports.');
