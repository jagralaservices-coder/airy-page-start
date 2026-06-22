
-- 1. P&L Report Function
CREATE OR REPLACE FUNCTION public.get_pl_report(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_revenue numeric;
  total_expenses numeric;
  category_data jsonb;
BEGIN
  -- Total revenue from orders
  SELECT COALESCE(SUM(total), 0) INTO total_revenue
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  -- Total expenses
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM expenses
  WHERE store_id = p_store_id
    AND date::date BETWEEN p_start_date AND p_end_date;

  -- Category-wise revenue
  SELECT COALESCE(jsonb_agg(cat_row), '[]'::jsonb) INTO category_data
  FROM (
    SELECT 
      item_data->>'category' as category,
      SUM((item_data->>'price')::numeric * COALESCE((item_data->>'quantity')::numeric, 1)) as revenue
    FROM orders o,
    jsonb_array_elements(o.items) AS item_data
    WHERE o.store_id = p_store_id
      AND o.status = 'completed'
      AND o.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY item_data->>'category'
    ORDER BY revenue DESC
  ) cat_row;

  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'total_expenses', total_expenses,
    'net_profit', total_revenue - total_expenses,
    'profit_margin', CASE WHEN total_revenue > 0 THEN ROUND(((total_revenue - total_expenses) / total_revenue) * 100, 2) ELSE 0 END,
    'category_breakdown', category_data
  );

  RETURN result;
END;
$$;

-- 2. Sales Trends Function
CREATE OR REPLACE FUNCTION public.get_sales_trends(
  p_store_id uuid,
  p_start_date date,
  p_end_date date,
  p_granularity text DEFAULT 'daily'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_granularity = 'daily' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY period), '[]'::jsonb) INTO result
    FROM (
      SELECT 
        created_at::date::text as period,
        COUNT(*) as order_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value
      FROM orders
      WHERE store_id = p_store_id
        AND status = 'completed'
        AND created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY created_at::date
    ) row_data;
  ELSIF p_granularity = 'weekly' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY period), '[]'::jsonb) INTO result
    FROM (
      SELECT 
        to_char(date_trunc('week', created_at), 'YYYY-"W"IW') as period,
        COUNT(*) as order_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value
      FROM orders
      WHERE store_id = p_store_id
        AND status = 'completed'
        AND created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY date_trunc('week', created_at)
    ) row_data;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY period), '[]'::jsonb) INTO result
    FROM (
      SELECT 
        to_char(date_trunc('month', created_at), 'YYYY-MM') as period,
        COUNT(*) as order_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value
      FROM orders
      WHERE store_id = p_store_id
        AND status = 'completed'
        AND created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY date_trunc('month', created_at)
    ) row_data;
  END IF;

  RETURN result;
END;
$$;

-- 3. Hourly Sales Function
CREATE OR REPLACE FUNCTION public.get_hourly_sales(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY hour), '[]'::jsonb) INTO result
  FROM (
    SELECT 
      EXTRACT(HOUR FROM created_at)::int as hour,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      AVG(total) as avg_order_value
    FROM orders
    WHERE store_id = p_store_id
      AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY EXTRACT(HOUR FROM created_at)
  ) row_data;

  RETURN result;
END;
$$;

-- 4. Customer Analytics Function
CREATE OR REPLACE FUNCTION public.get_customer_analytics(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  top_customers jsonb;
  total_customers int;
  repeat_customers int;
  new_customers int;
  avg_order_val numeric;
BEGIN
  -- Count unique customers
  SELECT COUNT(DISTINCT customer_phone) INTO total_customers
  FROM orders
  WHERE store_id = p_store_id
    AND customer_phone IS NOT NULL
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  -- Repeat customers (ordered more than once in period)
  SELECT COUNT(*) INTO repeat_customers
  FROM (
    SELECT customer_phone
    FROM orders
    WHERE store_id = p_store_id
      AND customer_phone IS NOT NULL
      AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY customer_phone
    HAVING COUNT(*) > 1
  ) rpt;

  new_customers := total_customers - repeat_customers;

  -- Average order value
  SELECT COALESCE(AVG(total), 0) INTO avg_order_val
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  -- Top 10 customers by spend
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO top_customers
  FROM (
    SELECT 
      COALESCE(customer_name, 'Walk-in') as name,
      customer_phone as phone,
      COUNT(*) as order_count,
      SUM(total) as total_spent,
      AVG(total) as avg_spent
    FROM orders
    WHERE store_id = p_store_id
      AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
      AND customer_phone IS NOT NULL
    GROUP BY customer_name, customer_phone
    ORDER BY total_spent DESC
    LIMIT 10
  ) row_data;

  result := jsonb_build_object(
    'total_customers', total_customers,
    'new_customers', new_customers,
    'repeat_customers', repeat_customers,
    'repeat_rate', CASE WHEN total_customers > 0 THEN ROUND((repeat_customers::numeric / total_customers) * 100, 2) ELSE 0 END,
    'avg_order_value', ROUND(avg_order_val, 2),
    'top_customers', top_customers
  );

  RETURN result;
END;
$$;

-- 5. Table Performance Function
CREATE OR REPLACE FUNCTION public.get_table_performance(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY revenue DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT 
      COALESCE(table_number, 'No Table') as table_name,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      AVG(total) as avg_order_value,
      COUNT(DISTINCT created_at::date) as active_days
    FROM orders
    WHERE store_id = p_store_id
      AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
      AND table_number IS NOT NULL
    GROUP BY table_number
  ) row_data;

  RETURN result;
END;
$$;

-- 6. Order Behavior Function
CREATE OR REPLACE FUNCTION public.get_order_behavior(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  type_breakdown jsonb;
  total_orders int;
  completed_orders int;
  cancelled_orders int;
BEGIN
  SELECT COUNT(*) INTO total_orders
  FROM orders
  WHERE store_id = p_store_id
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO completed_orders
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO cancelled_orders
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'cancelled'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO type_breakdown
  FROM (
    SELECT 
      order_type,
      COUNT(*) as count,
      SUM(total) as revenue,
      AVG(total) as avg_value
    FROM orders
    WHERE store_id = p_store_id
      AND status = 'completed'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY order_type
  ) row_data;

  result := jsonb_build_object(
    'total_orders', total_orders,
    'completed_orders', completed_orders,
    'cancelled_orders', cancelled_orders,
    'completion_rate', CASE WHEN total_orders > 0 THEN ROUND((completed_orders::numeric / total_orders) * 100, 2) ELSE 0 END,
    'type_breakdown', type_breakdown
  );

  RETURN result;
END;
$$;

-- 7. Payment Breakdown Function
CREATE OR REPLACE FUNCTION public.get_payment_breakdown(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  method_data jsonb;
  payment_stats jsonb;
BEGIN
  -- Payment method breakdown from orders, expanding part payments and supporting both object and array breakdown shapes
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO method_data
  FROM (
    WITH expanded_payments AS (
      SELECT 
        CASE 
          WHEN o.payment_method = 'part' AND o.payment_breakdown IS NOT NULL THEN
            CASE LOWER(CleanMethod.method)
              WHEN 'due' THEN 'credit'
              WHEN 'credit' THEN 'credit'
              ELSE LOWER(CleanMethod.method)
            END
          WHEN LOWER(o.payment_method) = 'due' OR LOWER(o.payment_method) = 'credit' THEN 'credit'
          ELSE LOWER(o.payment_method)
        END as payment_method,
        CASE 
          WHEN o.payment_method = 'part' AND o.payment_breakdown IS NOT NULL THEN (CleanMethod.amount)::numeric
          ELSE o.total 
        END as amount
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT key AS method, value AS amount
        FROM jsonb_each_text(o.payment_breakdown)
        WHERE jsonb_typeof(o.payment_breakdown) = 'object'

        UNION ALL

        SELECT elem->>'method' AS method, elem->>'amount' AS amount
        FROM jsonb_array_elements(o.payment_breakdown) elem
        WHERE jsonb_typeof(o.payment_breakdown) = 'array'
      ) AS CleanMethod ON o.payment_method = 'part' AND o.payment_breakdown IS NOT NULL
      WHERE o.store_id = p_store_id
        AND o.status = 'completed'
        AND o.created_at::date BETWEEN p_start_date AND p_end_date
    )
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(amount) as amount
    FROM expanded_payments
    WHERE payment_method IS NOT NULL
    GROUP BY payment_method
    ORDER BY amount DESC
  ) row_data;

  -- Payment gateway stats
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO payment_stats
  FROM (
    SELECT 
      status,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM payments
    WHERE store_id = p_store_id
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY status
  ) row_data;

  result := jsonb_build_object(
    'method_breakdown', method_data,
    'gateway_stats', payment_stats
  );

  RETURN result;
END;
$$;

-- 8. Tax Report Function
CREATE OR REPLACE FUNCTION public.get_tax_report(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_tax numeric;
  total_revenue numeric;
  order_count int;
BEGIN
  SELECT 
    COALESCE(SUM(tax), 0),
    COALESCE(SUM(total), 0),
    COUNT(*)
  INTO total_tax, total_revenue, order_count
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  result := jsonb_build_object(
    'total_tax', total_tax,
    'cgst', ROUND(total_tax / 2, 2),
    'sgst', ROUND(total_tax / 2, 2),
    'igst', 0,
    'total_revenue', total_revenue,
    'taxable_amount', total_revenue - total_tax,
    'order_count', order_count,
    'effective_tax_rate', CASE WHEN total_revenue > 0 THEN ROUND((total_tax / total_revenue) * 100, 2) ELSE 0 END
  );

  RETURN result;
END;
$$;

-- 9. Discount Report Function
CREATE OR REPLACE FUNCTION public.get_discount_report(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_discounts', COALESCE(SUM(discount), 0),
    'orders_with_discount', COUNT(*) FILTER (WHERE discount > 0),
    'total_orders', COUNT(*),
    'discount_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE discount > 0))::numeric / COUNT(*) * 100, 2) ELSE 0 END,
    'avg_discount', COALESCE(AVG(discount) FILTER (WHERE discount > 0), 0),
    'revenue_before_discount', COALESCE(SUM(subtotal), 0),
    'revenue_after_discount', COALESCE(SUM(total), 0),
    'revenue_impact', COALESCE(SUM(discount), 0)
  ) INTO result
  FROM orders
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  RETURN result;
END;
$$;

-- 10. Loss Control Function
CREATE OR REPLACE FUNCTION public.get_loss_control_report(
  p_store_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cancelled_data jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO cancelled_data
  FROM (
    SELECT 
      COALESCE(cancel_reason, 'No reason') as reason,
      COUNT(*) as count,
      SUM(total) as lost_revenue
    FROM orders
    WHERE store_id = p_store_id
      AND status = 'cancelled'
      AND created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY cancel_reason
    ORDER BY lost_revenue DESC
  ) row_data;

  SELECT jsonb_build_object(
    'total_cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total_completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_revenue', COALESCE(SUM(total) FILTER (WHERE status = 'cancelled'), 0),
    'total_discounts_given', COALESCE(SUM(discount) FILTER (WHERE status = 'completed'), 0),
    'cancellation_reasons', cancelled_data
  ) INTO result
  FROM orders
  WHERE store_id = p_store_id
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  RETURN result;
END;
$$;
