-- =========================================
-- 1) LOKALIZACJA TEKSTOWA DLA LISTINGS
-- =========================================

alter table public.listings
  add column if not exists city     text,
  add column if not exists region   text,  -- np. województwo
  add column if not exists country  text,  -- np. "PL" (zostawiamy text dla elastyczności)
  add column if not exists latitude  double precision check (latitude  between -90  and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);

-- Indeksy pod najczęstsze wyszukiwania
create index if not exists idx_listings_city      on public.listings (city);
create index if not exists idx_listings_region    on public.listings (region);
create index if not exists idx_listings_country   on public.listings (country);
create index if not exists idx_listings_lat_lon   on public.listings (latitude, longitude);

-- Uwaga: nie zmieniamy istniejących polityk RLS dla listings — lokalizacja to tylko dodatkowe kolumny.


-- =========================================
-- 2) TRANSAKCJE
-- =========================================

create table if not exists public.transactions (
  id            bigserial primary key,
  listing_id    bigint not null references public.listings(id) on delete cascade,
  buyer         uuid   not null references auth.users(id) on delete cascade,
  seller        uuid   not null references auth.users(id) on delete cascade,
  status        text   not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at    timestamptz default now(),
  completed_at  timestamptz,
  constraint trx_different_users check (buyer <> seller)
);

alter table public.transactions enable row level security;

-- Uczestnicy widzą swoje transakcje
drop policy if exists "Participants can read transactions" on public.transactions;
create policy "Participants can read transactions"
  on public.transactions
  for select
  using (auth.uid() in (buyer, seller));

-- (Opcjonalnie) tworzenie transakcji tylko przez uczestników
drop policy if exists "Participants can create transactions" on public.transactions;
create policy "Participants can create transactions"
  on public.transactions
  for insert
  with check (auth.uid() in (buyer, seller));

-- Indeksy
create index if not exists idx_transactions_listing_id   on public.transactions(listing_id);
create index if not exists idx_transactions_status       on public.transactions(status);
create index if not exists idx_transactions_participants on public.transactions(buyer, seller);


-- =========================================
-- 3) OCENY PO TRANSAKCJI (1–5) + KOMENTARZ
-- =========================================

create table if not exists public.ratings (
  id              bigserial primary key,
  transaction_id  bigint not null references public.transactions(id) on delete cascade,
  rater           uuid   not null references auth.users(id) on delete cascade,  -- kto wystawia
  ratee           uuid   not null references auth.users(id) on delete cascade,  -- kogo oceniamy
  score           integer not null check (score between 1 and 5),
  comment         text,                                  -- komentarz do oceny (opcjonalny)
  created_at      timestamptz default now(),
  constraint rating_no_self check (rater <> ratee),
  constraint unique_rating_per_pair unique (transaction_id, rater, ratee)
);

alter table public.ratings enable row level security;

-- Każdy może czytać oceny (jeśli chcesz je mieć publiczne)
drop policy if exists "Anyone can read ratings" on public.ratings;
create policy "Anyone can read ratings"
  on public.ratings
  for select
  using (true);

-- Wystawiać mogą tylko uczestnicy ZAKOŃCZONEJ transakcji
-- i tylko drugą stronę (rater -> ratee)
drop policy if exists "Participants of completed transaction can rate" on public.ratings;
create policy "Participants of completed transaction can rate"
  on public.ratings
  for insert
  with check (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and t.status = 'completed'
        and auth.uid() in (t.buyer, t.seller)
        and (
          (auth.uid() = t.buyer and ratee = t.seller) or
          (auth.uid() = t.seller and ratee = t.buyer)
        )
    )
  );

-- Brak polityk UPDATE/DELETE => użytkownicy nie mogą edytować/usuwać ocen (tylko service_role)

-- Indeksy pod listing i użytkownika ocenianego
create index if not exists idx_ratings_ratee       on public.ratings(ratee);
create index if not exists idx_ratings_transaction on public.ratings(transaction_id);


-- =========================================
-- 4) (OPCJONALNIE) PODSUMOWANIE OCEN
-- =========================================

-- Widok materializowany ze średnią oceną i liczbą ocen na użytkownika
create materialized view if not exists public.user_rating_summary as
select
  u.id                                 as user_id,
  count(r.id)                          as ratings_count,
  avg(r.score)::numeric(3,2)           as avg_score
from auth.users u
left join public.ratings r on r.ratee = u.id
group by u.id;

create index if not exists idx_user_rating_summary_user on public.user_rating_summary (user_id);

-- Odświeżanie:
--   refresh materialized view concurrently public.user_rating_summary;
-- (do CONCURRENTLY trzeba mieć index na wszystkich kolumnach unikalnych; powyższy wystarczy).
