-- Migration: enforce unique usernames + collision-safe signup derivation.
--
-- Context: /users/[username] routes resolve profiles by username, but
-- profiles.username had no unique constraint and handle_new_user derives it
-- from the email prefix — so foo@gmail.com and foo@yahoo.com would collide.
-- Live table was checked for duplicates before writing this (none found,
-- 9 profiles as of 2026-07-04); the defensive dedupe below is a no-op then
-- but protects against any duplicate created between that check and running
-- this migration.
--
-- Run in the Supabase SQL editor as one script.

-- 1. Defensive dedupe: suffix later-created duplicates (case-insensitive).
with ranked as (
  select id,
         row_number() over (
           partition by lower(username)
           order by created_at, id
         ) as rn
  from public.profiles
)
update public.profiles p
set username = p.username || r.rn::text
from ranked r
where r.id = p.id and r.rn > 1;

-- 2. Unique index, case-insensitive so "Foo" and "foo" can't coexist.
--    App lookups match the stored value exactly, so tightening to
--    lower(username) cannot break existing links.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

-- 3. Collision-safe profile creation on signup. Tries the email prefix,
--    then prefix2, prefix3, ... The insert itself is the collision check
--    (retry on unique_violation), so concurrent signups with the same
--    prefix can't race past a pre-check.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  base := lower(split_part(new.email, '@', 1));
  if base = '' then
    base := 'user';
  end if;

  candidate := base;

  loop
    begin
      insert into public.profiles (id, username)
      values (new.id, candidate)
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      n := n + 1;
      candidate := base || n::text;
    end;
  end loop;
end;
$$;
