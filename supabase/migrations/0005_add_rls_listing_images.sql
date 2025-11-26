--Pozwala wszystkim na pobieranie obrazków ogłoszeń
create policy "public read listing images"
on storage.objects
for select
to public
using (bucket_id = 'listing_images');

--Pozwala zalogowanym uploadować pliki
create policy "authenticated upload listing images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'listing_images');
