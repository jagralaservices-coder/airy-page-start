-- Add payment_breakdown column to orders table for part payment tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;

-- Create index on payment_breakdown for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_breakdown ON public.orders USING gin(payment_breakdown);

-- Update existing part payment orders to store breakdown in payment_breakdown column
UPDATE public.orders 
SET payment_breakdown = payment_details->'breakdown'
WHERE payment_method = 'part' 
  AND payment_details IS NOT NULL 
  AND payment_details->'breakdown' IS NOT NULL
  AND payment_breakdown IS NULL;
