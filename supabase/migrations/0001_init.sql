-- ===============================
-- EASYBAZAR: INIT SCHEMA
-- ===============================

-- UŻYTKOWNICY / PROFILE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- KATEGORIE
create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique,
  slug text not null unique
);

-- OGŁOSZENIA / PRODUKTY
create table if not exists public.listings (
  id bigserial primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  category_id bigint references public.categories(id),
  status text not null default 'active' check (status in ('active','sold','hidden')),
  created_at timestamp with time zone default now()
);

-- ZDJĘCIA OGŁOSZEŃ
create table if not exists public.listing_images (
  id bigserial primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  path text not null,
  created_at timestamp with time zone default now()
);

-- WĄTKI CZATU
create table if not exists public.threads (
  id bigserial primary key,
  listing_id bigint references public.listings(id) on delete set null,
  buyer uuid not null references auth.users(id) on delete cascade,
  seller uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  constraint different_users check (buyer <> seller)
);

-- WIADOMOŚCI
create table if not exists public.messages (
  id bigserial primary key,
  thread_id bigint not null references public.threads(id) on delete cascade,
  author uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone default now()
);

-- ===============================
-- RLS (Row Level Security)
-- ===============================
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;

-- ===============================
-- POLITYKI (RLS POLICIES)
-- ===============================

-- PROFILES
create policy "Profiles: public read"
on public.profiles
for select
using (true);

create policy "Profiles: user updates own"
on public.profiles
for update
using (auth.uid() = id);

-- LISTINGS
create policy "Listings: public read active or owner"
on public.listings
for select
using (status = 'active' or auth.uid() = owner);

create policy "Listings: owners insert own"
on public.listings
for insert
with check (auth.uid() = owner);

create policy "Listings: owners update own"
on public.listings
for update
using (auth.uid() = owner);

create policy "Listings: owners delete own"
on public.listings
for delete
using (auth.uid() = owner);

-- LISTING_IMAGES
create policy "Listing images: readable if listing visible to user"
on public.listing_images
for select
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or l.owner = auth.uid())
  )
);

create policy "Listing images: owner can insert"
on public.listing_images
for insert
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner = auth.uid()
  )
);

create policy "Listing images: owner can delete"
on public.listing_images
for delete
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner = auth.uid()
  )
);

-- THREADS
create policy "Threads: participants can read"
on public.threads
for select
using (auth.uid() = buyer or auth.uid() = seller);

create policy "Threads: participants can insert"
on public.threads
for insert
with check (auth.uid() = buyer or auth.uid() = seller);

-- MESSAGES
create policy "Messages: participants can read"
on public.messages
for select
using (
  exists (
    select 1 from public.threads t
    where t.id = thread_id
      and (auth.uid() = t.buyer or auth.uid() = t.seller)
  )
);

create policy "Messages: participants can insert"
on public.messages
for insert
with check (
  exists (
    select 1 from public.threads t
    where t.id = thread_id
      and (auth.uid() = t.buyer or auth.uid() = t.seller)
  )
);

-- ===============================
-- TRIGGER: auto-tworzenie profilu
-- ===============================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===============================
-- SEED (opcjonalny)
-- ===============================
insert into public.categories (name, slug) values
  ('Elektronika', 'elektronika'),
  ('Dom i ogród', 'dom-ogrod'),
  ('Moda', 'moda')
on conflict do nothing;
