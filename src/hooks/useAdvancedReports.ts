import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReportType = 
  | 'pl' | 'salesTrend' | 'hourly' | 'customer' 
  | 'table' | 'orderBehavior' | 'payment' | 'tax' 
  | 'discount' | 'lossControl' | 'multiOutlet' | 'invoice' | 'aiInsights'
  | 'itemPerformance' | 'retention' | 'targetAchievement' | 'kitchen' | 'delivery';

interface DateRange {
  start: Date;
  end: Date;
}

export function useAdvancedReports(storeId: string | null) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = useCallback(async (
    reportType: ReportType,
    dateRange: DateRange,
    options?: { granularity?: string; customerId?: string }
  ) => {
    if (!storeId) {
      toast.error('No store selected');
      return;
    }

    setLoading(true);
    try {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      const fnMap: Record<string, string> = {
        pl: 'get_pl_report',
        salesTrend: 'get_sales_trends',
        hourly: 'get_hourly_sales',
        customer: 'get_customer_analytics',
        table: 'get_table_performance',
        orderBehavior: 'get_order_behavior',
        payment: 'get_payment_breakdown',
        tax: 'get_tax_report',
        discount: 'get_discount_report',
        lossControl: 'get_loss_control_report',
        itemPerformance: 'get_item_performance',
        retention: 'get_customer_retention',
        targetAchievement: 'get_target_achievement',
        kitchen: 'get_kitchen_performance',
        delivery: 'get_delivery_performance',
        invoice: 'get_invoice_report',
      };

      const fnName = fnMap[reportType];
      if (!fnName) {
        // multiOutlet uses p_customer_id - handled separately
        if (reportType === 'multiOutlet') {
          const { data: result, error } = await supabase.rpc('get_multi_outlet_report' as any, {
            p_customer_id: options?.customerId || storeId,
            p_start_date: startDate,
            p_end_date: endDate,
          });
          if (error) { console.error('Multi-outlet error:', error); toast.error('Failed to load report'); }
          else setData(result);
          return;
        }
        setData(null);
        return;
      }

      const params: any = {
        p_store_id: storeId,
        p_start_date: startDate,
        p_end_date: endDate,
      };

      if (reportType === 'salesTrend' && options?.granularity) {
        params.p_granularity = options.granularity;
      }

      const { data: result, error } = await supabase.rpc(fnName as any, params);

      if (error) {
        console.error(`Report error (${reportType}):`, error);
        toast.error(`Failed to load report`);
        return;
      }

      setData(result);
    } catch (err) {
      console.error('Report fetch error:', err);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  return { loading, data, fetchReport };
}
