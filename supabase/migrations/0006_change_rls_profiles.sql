-- skasuj starą
drop policy if exists "Profiles: public read" on public.profiles;

-- SELECT: tylko właściciel
create policy "Profiles: user reads own"
on public.profiles
for select
using (auth.uid() = id);

-- UPDATE: już masz, ale dla pewności:
drop policy if exists "Profiles: user updates own" on public.profiles;

create policy "Profiles: user updates own"
on public.profiles
for update
using (auth.uid() = id);
