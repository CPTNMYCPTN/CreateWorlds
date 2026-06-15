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

-- Row level security -----------------------------------------------------

alter table public.worlds enable row level security;
alter table public.world_members enable row level security;

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
      select 1 from public.world_members m
      where m.world_id = world_members.world_id and m.user_id = auth.uid()
    )
  );

create policy "World owners can add members (e.g. themselves as owner)"
  on public.world_members for insert
  with check (
    exists (
      select 1 from public.worlds w
      where w.id = world_id and w.owner_id = auth.uid()
    )
  );

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

-- Profiles ------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
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

create table if not exists public.world_map_hotspots (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  map_image_url text not null,
  label text not null,
  link_type text,
  link_id text,
  x_percent numeric not null,
  y_percent numeric not null,
  created_at timestamptz not null default now(),
  constraint world_map_hotspots_link_check check (
    (link_type is null and link_id is null)
    or (link_type in ('folder', 'thread', 'url') and link_id is not null)
  )
);

alter table public.world_map_hotspots enable row level security;

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

create policy "Imported characters are visible to world members"
  on public.characters for select
  using (
    exists (
      select 1 from public.world_characters wc
      join public.worlds w on w.id = wc.world_id
      where wc.character_id = characters.id
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

create policy "Templates used by visible characters are visible too"
  on public.character_templates for select
  using (
    exists (
      select 1 from public.characters c
      where c.template_id = character_templates.id
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.world_characters wc
          join public.worlds w on w.id = wc.world_id
          where wc.character_id = c.id
          and (
            w.is_public
            or w.owner_id = auth.uid()
            or exists (
              select 1 from public.world_members m
              where m.world_id = w.id and m.user_id = auth.uid()
            )
          )
        )
      )
    )
  );
