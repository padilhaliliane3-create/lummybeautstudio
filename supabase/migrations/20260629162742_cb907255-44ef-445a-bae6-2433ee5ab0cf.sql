-- storage policies para bucket client-photos
-- estrutura de path: {client_id}/{uuid}.jpg

CREATE POLICY "client-photos admin all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'client-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "client-photos client read own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.auth_user_id = auth.uid()
      AND c.id::text = split_part(name, '/', 1)
  )
);
