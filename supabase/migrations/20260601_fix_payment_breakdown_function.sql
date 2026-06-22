-- Ensure the payment_breakdown column and index exist first so that the function compiles and runs without any issues
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;
CREATE INDEX IF NOT EXISTS idx_orders_payment_breakdown ON public.orders USING gin(payment_breakdown);

-- Redefine get_payment_breakdown to aggregate part payment methods from breakdown records
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
        END as method,
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
      method as payment_method,
      COUNT(*) as count,
      SUM(amount) as amount
    FROM expanded_payments
    WHERE method IS NOT NULL
    GROUP BY method
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
