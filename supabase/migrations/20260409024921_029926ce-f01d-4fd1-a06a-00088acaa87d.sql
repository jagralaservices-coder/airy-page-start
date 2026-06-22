
-- 1. Item Performance Report
CREATE OR REPLACE FUNCTION public.get_item_performance(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  items_data jsonb;
  total_rev numeric;
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO total_rev
  FROM orders WHERE store_id = p_store_id AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY revenue DESC), '[]'::jsonb) INTO items_data
  FROM (
    SELECT
      item_data->>'name' as name,
      item_data->>'category' as category,
      SUM(COALESCE((item_data->>'quantity')::numeric, 1)) as qty_sold,
      SUM((item_data->>'price')::numeric * COALESCE((item_data->>'quantity')::numeric, 1)) as revenue,
      CASE WHEN total_rev > 0 THEN ROUND(SUM((item_data->>'price')::numeric * COALESCE((item_data->>'quantity')::numeric, 1)) / total_rev * 100, 2) ELSE 0 END as contribution_pct
    FROM orders o, jsonb_array_elements(o.items) AS item_data
    WHERE o.store_id = p_store_id AND o.status = 'completed'
      AND o.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY item_data->>'name', item_data->>'category'
  ) row_data;

  result := jsonb_build_object(
    'total_revenue', total_rev,
    'total_items', (SELECT COUNT(DISTINCT item_data->>'name') FROM orders o, jsonb_array_elements(o.items) AS item_data WHERE o.store_id = p_store_id AND o.status = 'completed' AND o.created_at::date BETWEEN p_start_date AND p_end_date),
    'items', items_data
  );
  RETURN result;
END;
$$;

-- 2. Customer Retention Report
CREATE OR REPLACE FUNCTION public.get_customer_retention(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  freq_data jsonb;
  total_cust int;
  repeat_cust int;
  single_cust int;
BEGIN
  SELECT COUNT(DISTINCT customer_phone) INTO total_cust
  FROM orders WHERE store_id = p_store_id AND customer_phone IS NOT NULL AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO repeat_cust FROM (
    SELECT customer_phone FROM orders
    WHERE store_id = p_store_id AND customer_phone IS NOT NULL AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY customer_phone HAVING COUNT(*) > 1
  ) r;

  single_cust := total_cust - repeat_cust;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY visit_count DESC), '[]'::jsonb) INTO freq_data
  FROM (
    SELECT
      CASE
        WHEN cnt = 1 THEN '1 visit'
        WHEN cnt BETWEEN 2 AND 3 THEN '2-3 visits'
        WHEN cnt BETWEEN 4 AND 5 THEN '4-5 visits'
        ELSE '6+ visits'
      END as visit_count,
      COUNT(*) as customer_count
    FROM (
      SELECT customer_phone, COUNT(*) as cnt FROM orders
      WHERE store_id = p_store_id AND customer_phone IS NOT NULL AND status = 'completed'
        AND created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY customer_phone
    ) freq GROUP BY 1
  ) row_data;

  result := jsonb_build_object(
    'total_customers', total_cust,
    'repeat_customers', repeat_cust,
    'single_visit', single_cust,
    'retention_rate', CASE WHEN total_cust > 0 THEN ROUND(repeat_cust::numeric / total_cust * 100, 2) ELSE 0 END,
    'churn_rate', CASE WHEN total_cust > 0 THEN ROUND(single_cust::numeric / total_cust * 100, 2) ELSE 0 END,
    'frequency_breakdown', freq_data
  );
  RETURN result;
END;
$$;

-- 3. Kitchen Performance (based on preparation_time in menu_items)
CREATE OR REPLACE FUNCTION public.get_kitchen_performance(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  total_orders int;
  completed int;
  cancelled int;
  avg_items numeric;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed'), COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO total_orders, completed, cancelled
  FROM orders WHERE store_id = p_store_id AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(AVG(jsonb_array_length(items)), 0) INTO avg_items
  FROM orders WHERE store_id = p_store_id AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  result := jsonb_build_object(
    'total_orders', total_orders,
    'completed_orders', completed,
    'cancelled_orders', cancelled,
    'completion_rate', CASE WHEN total_orders > 0 THEN ROUND(completed::numeric / total_orders * 100, 2) ELSE 0 END,
    'avg_items_per_order', ROUND(avg_items, 1),
    'efficiency_score', CASE WHEN total_orders > 0 THEN ROUND(completed::numeric / total_orders * 100, 0) ELSE 0 END
  );
  RETURN result;
END;
$$;

-- 4. Delivery Performance
CREATE OR REPLACE FUNCTION public.get_delivery_performance(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  staff_data jsonb;
  total_del int;
  completed_del int;
  avg_time numeric;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'delivered')
  INTO total_del, completed_del
  FROM delivery_assignments WHERE store_id = p_store_id
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60), 0) INTO avg_time
  FROM delivery_assignments WHERE store_id = p_store_id AND delivered_at IS NOT NULL
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY deliveries DESC), '[]'::jsonb) INTO staff_data
  FROM (
    SELECT delivery_boy_name as name, COUNT(*) as deliveries,
      COUNT(*) FILTER (WHERE status = 'delivered') as completed,
      COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60) FILTER (WHERE delivered_at IS NOT NULL), 0) as avg_mins
    FROM delivery_assignments WHERE store_id = p_store_id
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY delivery_boy_name
  ) row_data;

  result := jsonb_build_object(
    'total_deliveries', total_del,
    'completed_deliveries', completed_del,
    'avg_delivery_time_mins', ROUND(avg_time, 1),
    'completion_rate', CASE WHEN total_del > 0 THEN ROUND(completed_del::numeric / total_del * 100, 2) ELSE 0 END,
    'staff_performance', staff_data
  );
  RETURN result;
END;
$$;

-- 5. Invoice & Due Report
CREATE OR REPLACE FUNCTION public.get_invoice_report(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  recent jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb) INTO recent
  FROM (
    SELECT customer_name, customer_phone, total_amount, paid_amount, due_amount, payment_status, created_at::text
    FROM credit_ledger WHERE store_id = p_store_id
      AND created_at::date BETWEEN p_start_date AND p_end_date
    LIMIT 50
  ) row_data;

  result := jsonb_build_object(
    'total_credit_sales', (SELECT COALESCE(SUM(total_amount), 0) FROM credit_ledger WHERE store_id = p_store_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    'total_paid', (SELECT COALESCE(SUM(paid_amount), 0) FROM credit_ledger WHERE store_id = p_store_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    'total_outstanding', (SELECT COALESCE(SUM(due_amount), 0) FROM credit_ledger WHERE store_id = p_store_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    'paid_count', (SELECT COUNT(*) FROM credit_ledger WHERE store_id = p_store_id AND payment_status = 'paid' AND created_at::date BETWEEN p_start_date AND p_end_date),
    'partial_count', (SELECT COUNT(*) FROM credit_ledger WHERE store_id = p_store_id AND payment_status = 'partial' AND created_at::date BETWEEN p_start_date AND p_end_date),
    'unpaid_count', (SELECT COUNT(*) FROM credit_ledger WHERE store_id = p_store_id AND payment_status = 'unpaid' AND created_at::date BETWEEN p_start_date AND p_end_date),
    'recent_entries', recent
  );
  RETURN result;
END;
$$;

-- 6. Multi-Outlet Report
CREATE OR REPLACE FUNCTION public.get_multi_outlet_report(p_customer_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY revenue DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT
      s.store_name,
      s.id as store_id,
      COUNT(o.id) as order_count,
      COALESCE(SUM(o.total), 0) as revenue,
      COALESCE(AVG(o.total), 0) as avg_order_value
    FROM stores s
    LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'completed'
      AND o.created_at::date BETWEEN p_start_date AND p_end_date
    WHERE s.customer_id = p_customer_id AND s.is_active = true
    GROUP BY s.id, s.store_name
  ) row_data;

  RETURN result;
END;
$$;

-- 7. Target vs Achievement (uses orders data with daily aggregation)
CREATE OR REPLACE FUNCTION public.get_target_achievement(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  daily_data jsonb;
  total_rev numeric;
  total_days int;
  avg_daily numeric;
BEGIN
  SELECT COALESCE(SUM(total), 0), COUNT(DISTINCT created_at::date)
  INTO total_rev, total_days
  FROM orders WHERE store_id = p_store_id AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  avg_daily := CASE WHEN total_days > 0 THEN ROUND(total_rev / total_days, 2) ELSE 0 END;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY day), '[]'::jsonb) INTO daily_data
  FROM (
    SELECT created_at::date::text as day, COUNT(*) as orders, SUM(total) as revenue
    FROM orders WHERE store_id = p_store_id AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY created_at::date
  ) row_data;

  result := jsonb_build_object(
    'total_revenue', total_rev,
    'total_days', total_days,
    'avg_daily_revenue', avg_daily,
    'daily_data', daily_data
  );
  RETURN result;
END;
$$;
