-- Run this in the Supabase SQL editor before using /worlds/create.

-- Tables ---------------------------------------------------------------

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_public boolean not null default false,
  banner_url text,
  icon_url text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.world_members (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (world_id, user_id)
);

create table if not exists public.world_invites (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  check (max_uses is null or max_uses > 0)
);

-- Row level security -----------------------------------------------------

alter table public.worlds enable row level security;
alter table public.world_members enable row level security;
alter table public.world_invites enable row level security;

create policy "Worlds are visible to owners, members, and the public if public"
  on public.worlds for select
  using (
    is_public
    or owner_id = auth.uid()
    or exists (
      select 1 from public.world_members m
      where m.world_id = worlds.id and m.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create worlds they own"
  on public.worlds for insert
  with check (owner_id = auth.uid());

create policy "Owners can update their worlds"
  on public.worlds for update
  using (owner_id = auth.uid());

create policy "Owners can delete their worlds"
  on public.worlds for delete
  using (owner_id = auth.uid());

create policy "Members are visible to other members of the same world"
  on public.world_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_members.world_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.world_members m
      where m.world_id = world_members.world_id and m.user_id = auth.uid()
    )
  );

create policy "Users can join worlds they are invited to or public worlds"
  on public.world_members for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.worlds w
        where w.id = world_id and (
          w.is_public
          or w.owner_id = auth.uid()
        )
      )
      or exists (
        select 1 from public.world_invites i
        where i.world_id = world_id
      )
    )
  );

create policy "Owners can update member roles"
  on public.world_members for update
  using (
    role <> 'owner'
    and exists (
      select 1 from public.worlds w
      where w.id = world_members.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    role <> 'owner'
    and exists (
      select 1 from public.worlds w
      where w.id = world_members.world_id and w.owner_id = auth.uid()
    )
  );

create policy "Owners and admins can remove members"
  on public.world_members for delete
  using (
    role <> 'owner'
    and (
      exists (
        select 1 from public.worlds w
        where w.id = world_members.world_id and w.owner_id = auth.uid()
      )
      or (
        role = 'member'
        and exists (
          select 1 from public.world_members admin_row
          where admin_row.world_id = world_members.world_id
          and admin_row.user_id = auth.uid()
          and admin_row.role = 'admin'
        )
      )
    )
  );

create policy "Anyone can read invites by code"
  on public.world_invites for select
  using (true);

create policy "Owners can manage invites for their worlds"
  on public.world_invites for all
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_invites.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.worlds w
      where w.id = world_invites.world_id and w.owner_id = auth.uid()
    )
  );

-- Lets a viewer who is not yet a member preview the world behind a valid,
-- unexpired, not-maxed-out invite code, bypassing the normal worlds SELECT
-- RLS (which would otherwise hide private worlds from non-members).
create or replace function public.get_invite_world(invite_code text)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  is_public boolean,
  banner_url text,
  icon_url text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select w.id, w.name, w.slug, w.description, w.is_public, w.banner_url, w.icon_url
  from public.world_invites i
  join public.worlds w on w.id = i.world_id
  where i.code = invite_code
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.uses < i.max_uses)
  limit 1;
$$;

revoke all on function public.get_invite_world(text) from public;
grant execute on function public.get_invite_world(text) to anon, authenticated;

-- Storage ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('world-banners', 'world-banners', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('world-icons', 'world-icons', true)
on conflict (id) do nothing;

create policy "Anyone can view world banners"
  on storage.objects for select
  using (bucket_id = 'world-banners');

create policy "Users can upload world banners to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'world-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view world icons"
  on storage.objects for select
  using (bucket_id = 'world-icons');

create policy "Users can upload world icons to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'world-icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Folders ----------------------------------------------------------------

create table if not exists public.world_folders (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.world_folders enable row level security;

create policy "Folders are visible to anyone who can see the world"
  on public.world_folders for select
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_folders.world_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "World owners can manage folders"
  on public.world_folders for all
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_folders.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.worlds w
      where w.id = world_folders.world_id and w.owner_id = auth.uid()
    )
  );

-- Threads ------------------------------------------------------------------

create table if not exists public.world_threads (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.world_folders (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.world_threads enable row level security;

create policy "Threads are visible to anyone who can see the world"
  on public.world_threads for select
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_threads.world_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "World members can create threads"
  on public.world_threads for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.world_members m
      where m.world_id = world_threads.world_id and m.user_id = auth.uid()
    )
  );

create policy "Thread author or world owner can update threads"
  on public.world_threads for update
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_threads.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_threads.world_id and w.owner_id = auth.uid()
    )
  );

create policy "Thread author or world owner can delete threads"
  on public.world_threads for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_threads.world_id and w.owner_id = auth.uid()
    )
  );

-- Profiles ------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are visible to everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Migration: add columns to existing profiles tables.
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text;

-- Create a profile automatically whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already existed before this trigger.
insert into public.profiles (id, username)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- Posts ------------------------------------------------------------------

create table if not exists public.world_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.world_threads (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.world_posts enable row level security;

create policy "Posts are visible to anyone who can see the world"
  on public.world_posts for select
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_posts.world_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "World members can create posts"
  on public.world_posts for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.world_members m
      where m.world_id = world_posts.world_id and m.user_id = auth.uid()
    )
  );

create policy "Post author or world owner can update posts"
  on public.world_posts for update
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_posts.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_posts.world_id and w.owner_id = auth.uid()
    )
  );

create policy "Post author or world owner can delete posts"
  on public.world_posts for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.worlds w
      where w.id = world_posts.world_id and w.owner_id = auth.uid()
    )
  );

-- Storage ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Anyone can view post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Users can upload post images to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Character templates --------------------------------------------------------

create table if not exists public.character_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.character_templates enable row level security;

create policy "Users can manage their own character templates"
  on public.character_templates for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Characters -------------------------------------------------------------

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.character_templates (id) on delete set null,
  name text not null,
  avatar_url text,
  field_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "Users can manage their own characters"
  on public.characters for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Replaced by narrower visibility rules below: owner, or imported into a
-- world the viewer can see (see character_visible_via_world).
drop policy if exists "Characters are publicly visible" on public.characters;

-- Storage ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('character-avatars', 'character-avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view character avatars"
  on storage.objects for select
  using (bucket_id = 'character-avatars');

create policy "Users can upload character avatars to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'character-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- World maps ---------------------------------------------------------------

alter table public.worlds add column if not exists map_url text;

-- World theming --------------------------------------------------------------

alter table public.worlds add column if not exists settings jsonb not null default '{}'::jsonb;

create table if not exists public.world_map_hotspots (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  map_image_url text not null,
  label text not null,
  x_percent numeric not null,
  y_percent numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.world_hotspot_links (
  id uuid primary key default gen_random_uuid(),
  hotspot_id uuid not null references public.world_map_hotspots (id) on delete cascade,
  link_type text not null check (link_type in ('folder', 'thread', 'url')),
  link_id text not null,
  label text,
  created_at timestamptz not null default now()
);

-- Migrate away from the old single-link model: copy any existing link into
-- world_hotspot_links before dropping the columns from world_map_hotspots.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'world_map_hotspots'
      and column_name = 'link_type'
  ) then
    insert into public.world_hotspot_links (hotspot_id, link_type, link_id)
    select id, link_type, link_id
    from public.world_map_hotspots
    where link_type is not null and link_id is not null;
  end if;
end $$;

alter table public.world_map_hotspots drop constraint if exists world_map_hotspots_link_check;
alter table public.world_map_hotspots drop column if exists link_type;
alter table public.world_map_hotspots drop column if exists link_id;

alter table public.world_map_hotspots enable row level security;
alter table public.world_hotspot_links enable row level security;

create policy "Hotspots are visible to anyone who can see the world"
  on public.world_map_hotspots for select
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_map_hotspots.world_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "World owners can manage map hotspots"
  on public.world_map_hotspots for all
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_map_hotspots.world_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.worlds w
      where w.id = world_map_hotspots.world_id and w.owner_id = auth.uid()
    )
  );

create policy "Hotspot links are visible to anyone who can see the world"
  on public.world_hotspot_links for select
  using (
    exists (
      select 1 from public.world_map_hotspots h
      join public.worlds w on w.id = h.world_id
      where h.id = world_hotspot_links.hotspot_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "World owners can manage hotspot links"
  on public.world_hotspot_links for all
  using (
    exists (
      select 1 from public.world_map_hotspots h
      join public.worlds w on w.id = h.world_id
      where h.id = world_hotspot_links.hotspot_id
      and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.world_map_hotspots h
      join public.worlds w on w.id = h.world_id
      where h.id = world_hotspot_links.hotspot_id
      and w.owner_id = auth.uid()
    )
  );

-- Storage ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('world-maps', 'world-maps', true)
on conflict (id) do nothing;

create policy "Anyone can view world maps"
  on storage.objects for select
  using (bucket_id = 'world-maps');

create policy "Users can upload world maps to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'world-maps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- World characters ----------------------------------------------------------

create table if not exists public.world_characters (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (world_id, character_id)
);

alter table public.world_characters enable row level security;

create policy "World characters are visible to anyone who can see the world"
  on public.world_characters for select
  using (
    exists (
      select 1 from public.worlds w
      where w.id = world_characters.world_id
      and (
        w.is_public
        or w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "Members can import their own characters into a world"
  on public.world_characters for insert
  with check (
    exists (
      select 1 from public.characters c
      where c.id = world_characters.character_id and c.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.worlds w
      where w.id = world_characters.world_id
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1 from public.world_members m
          where m.world_id = w.id and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "Character owners can remove their world imports"
  on public.world_characters for delete
  using (
    exists (
      select 1 from public.characters c
      where c.id = world_characters.character_id and c.owner_id = auth.uid()
    )
  );

-- Characters imported into a shared world are visible to its members --------
--
-- security definer so this can be safely called from the characters and
-- character_templates RLS policies below without depending on the calling
-- user already having independent SELECT rights on world_characters/worlds
-- at evaluation time (and to keep the visibility logic in one place instead
-- of duplicated across policies, where it previously drifted out of sync).
create or replace function public.character_visible_via_world(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.world_characters wc
    join public.worlds w on w.id = wc.world_id
    where wc.character_id = target_character_id
    and (
      w.is_public
      or w.owner_id = auth.uid()
      or exists (
        select 1 from public.world_members m
        where m.world_id = w.id and m.user_id = auth.uid()
      )
    )
  );
$$;

grant execute on function public.character_visible_via_world(uuid) to authenticated, anon;

drop policy if exists "Imported characters are visible to world members" on public.characters;

create policy "Imported characters are visible to world members"
  on public.characters for select
  using (public.character_visible_via_world(characters.id));

drop policy if exists "Templates used by visible characters are visible too" on public.character_templates;

create policy "Templates used by visible characters are visible too"
  on public.character_templates for select
  using (
    exists (
      select 1 from public.characters c
      where c.template_id = character_templates.id
      and (
        c.owner_id = auth.uid()
        or public.character_visible_via_world(c.id)
      )
    )
  );

-- Realtime ---------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'world_posts'
  ) then
    alter publication supabase_realtime add table public.world_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'world_threads'
  ) then
    alter publication supabase_realtime add table public.world_threads;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'world_folders'
  ) then
    alter publication supabase_realtime add table public.world_folders;
  end if;
end $$;

-- Profile avatars storage -----------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view profile avatars"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

create policy "Users can upload their own profile avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own profile avatar"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Wiki pages ------------------------------------------------------------
--
-- wiki_pages and its RLS policies already exist in the live database
-- (applied manually). This block is reference-only documentation of the
-- table shape the app code expects — it is intentionally commented out and
-- must NOT be run as a migration. The self-referencing FK follows Postgres's
-- default auto-naming convention, which the app relies on for FK-qualified
-- embeds: wiki_pages_parent_page_id_fkey.
--
-- create table public.wiki_pages (
--   id uuid primary key default gen_random_uuid(),
--   world_id uuid not null references public.worlds (id) on delete cascade,
--   parent_page_id uuid references public.wiki_pages (id) on delete set null,
--   slug text not null,
--   title text not null,
--   content text not null default '',
--   position integer not null default 0,
--   created_by uuid references auth.users (id) on delete set null,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now(),
--   unique (world_id, slug)
-- );
