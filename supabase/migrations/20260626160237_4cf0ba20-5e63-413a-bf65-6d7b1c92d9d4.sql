
create policy "site-assets public read"
on storage.objects for select
using (bucket_id = 'site-assets');

create policy "site-assets admin insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));

create policy "site-assets admin update"
on storage.objects for update to authenticated
using (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));

create policy "site-assets admin delete"
on storage.objects for delete to authenticated
using (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));
