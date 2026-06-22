-- Enable realtime for orders table so all devices get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;