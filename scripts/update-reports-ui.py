import os
import re

reports_dir = r"c:\Users\Admin\Downloads\pos-heartbeat-14-main\pos-heartbeat-14-main\src\pages\reports"

import_to_add = """import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
"""

effect_code = """  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  useEffect(() => {
    if (dateRange?.from) {
      setTimeRange('custom');
    } else if (timeRange === 'custom') {
      setTimeRange('today');
    }
  }, [dateRange]);
"""

tabs_regex = re.compile(r"<Tabs value=\{timeRange\}.*?</Tabs>", re.DOTALL)
replacement_ui = """<div className="flex items-center gap-2">
            <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => { setTimeRange('today'); setDateRange(undefined); }} className="h-9">Today</Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>"""

for filename in os.listdir(reports_dir):
    if not filename.endswith(".tsx"): continue
    path = os.path.join(reports_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if already processed
    if "DatePickerWithRange" in content:
        continue

    # Add imports
    if "import React, { useState" in content:
        content = content.replace("import React, { useState }", "import React, { useState, useEffect }")
    elif "import React, { useState," in content:
        content = content.replace("import React, { useState,", "import React, { useState, useEffect,")
    
    content = content.replace("import { useAnalytics", import_to_add + "import { useAnalytics")

    # Add state and effect
    content = content.replace(
        "const [timeRange, setTimeRange] = useState<TimeRange>('today');\n",
        "const [timeRange, setTimeRange] = useState<TimeRange>('today');\n" + effect_code
    )

    # Update useAnalytics call
    content = content.replace("useAnalytics(timeRange)", "useAnalytics(timeRange, dateRange)")

    # Replace the Tabs component
    content = tabs_regex.sub(replacement_ui, content)

    # Also fix the dateRangeLabel for exports/prints
    label_regex = re.compile(r"const dateRangeLabel = timeRange === 'today' \? 'Today' : timeRange === 'week' \? 'This Week' : 'This Month';")
    new_label = """const dateRangeLabel = timeRange === 'custom' && dateRange?.from 
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to ? dateRange.to.toLocaleDateString() : 'Now'}`
      : timeRange === 'today' ? 'Today' : 'Today';"""
    content = label_regex.sub(new_label, content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Done updating reports.")
