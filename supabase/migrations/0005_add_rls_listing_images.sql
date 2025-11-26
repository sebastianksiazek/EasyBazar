-- Na wszelki wypadek (powinno już być, ale nie zaszkodzi)
alter table storage.objects enable row level security;

-- Bucket już istnieje, więc tylko zabezpieczenie,
-- że będzie publiczny i z poprawnym id
insert into storage.buckets (id, name, public)
values ('listing_images', 'listing_images', true)
on conflict (id) do update set public = excluded.public;

-- Publiczny odczyt plików z listing_images
create policy "public read listing images"
on storage.objects
for select
to public
using (bucket_id = 'listing_images');

--Upload tylko dla zalogowanych
create policy "authenticated upload listing images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'listing_images');

