
-- Create storage bucket for engagement content assets
INSERT INTO storage.buckets (id, name, public) VALUES ('content-assets', 'content-assets', true);

-- Allow authenticated users to upload to their engagement folder
CREATE POLICY "Authenticated users can upload content assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-assets');

-- Allow authenticated users to view content assets
CREATE POLICY "Anyone can view content assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update content assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete content assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-assets');
