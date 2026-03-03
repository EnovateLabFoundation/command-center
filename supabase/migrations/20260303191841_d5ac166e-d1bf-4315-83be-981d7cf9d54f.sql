-- Enable realtime for intel_items so the monitoring hub can subscribe to live inserts
ALTER PUBLICATION supabase_realtime ADD TABLE public.intel_items;