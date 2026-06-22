UPDATE public.feature_catalog
SET included_in = ARRAY['basic','gold','platinum']
WHERE feature_key = 'rpt_order_summary';