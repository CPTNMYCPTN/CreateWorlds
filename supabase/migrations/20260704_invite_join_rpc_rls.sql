-- Migration: invite joins via RPC + close two invite RLS holes.
--
-- Holes being closed:
--   1. world_invites had `for select using (true)` — anyone could enumerate
--      every invite code via PostgREST and join any private world.
--   2. The world_members insert policy allowed joining any world that had
--      ANY invite row, without knowing a code.
-- The old JS join flow was also non-atomic (separate membership pre-check,
-- insert, and uses increment — the counter raced under concurrency).
--
-- After this migration, joining and invite-status reads go through
-- security-definer RPCs; possessing the code is the capability.
--
-- IMPORTANT: deploy the matching app code (invite/[code]/actions.ts and
-- page.tsx switching to these RPCs) together with running this — the old
-- code reads world_invites directly and breaks once the select policy drops.
--
-- Run in the Supabase SQL editor as one script.

-- 1. Atomic, code-gated join.
create or replace function public.join_world_from_invite(invite_code text)
returns table (world_slug text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite record;
  v_slug text;
  v_rowcount integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- Lock the invite row so concurrent joins serialize on the uses counter.
  select i.id, i.world_id, i.expires_at, i.max_uses, i.uses
  into v_invite
  from public.world_invites i
  where i.code = invite_code
  for update;

  if not found then
    raise exception 'invalid_invite';
  end if;

  if (v_invite.expires_at is not null and v_invite.expires_at <= now())
     or (v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses) then
    raise exception 'invite_expired_or_maxed';
  end if;

  select w.slug into v_slug from public.worlds w where w.id = v_invite.world_id;

  insert into public.world_members (world_id, user_id, role)
  values (v_invite.world_id, auth.uid(), 'member')
  on conflict (world_id, user_id) do nothing;

  get diagnostics v_rowcount = row_count;

  -- Only a genuinely new membership consumes a use.
  if v_rowcount = 1 then
    update public.world_invites set uses = uses + 1 where id = v_invite.id;
    return query select v_slug, 'joined'::text;
  else
    return query select v_slug, 'already_member'::text;
  end if;
end;
$$;

revoke all on function public.join_world_from_invite(text) from public;
grant execute on function public.join_world_from_invite(text) to authenticated;

-- 2. Invite status for the preview page (invalid vs expired vs valid),
--    replacing its direct world_invites read. Lookup is by exact code, so
--    nothing is enumerable.
create or replace function public.get_invite_status(invite_code text)
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select case
    when i.id is null then 'invalid'
    when (i.expires_at is not null and i.expires_at <= now())
      or (i.max_uses is not null and i.uses >= i.max_uses) then 'expired_or_maxed'
    else 'valid'
  end
  from (select 1) as one
  left join public.world_invites i on i.code = invite_code;
$$;

revoke all on function public.get_invite_status(text) from public;
grant execute on function public.get_invite_status(text) to anon, authenticated;

-- 3. Drop the enumerable select policy. Owners keep full access through the
--    existing "Owners can manage invites for their worlds" for-all policy.
drop policy if exists "Anyone can read invites by code" on public.world_invites;

-- 4. Remove the invite-existence loophole from the member insert policy.
--    Invite joins now come through join_world_from_invite (security definer
--    bypasses RLS); direct inserts remain for public worlds and for owners
--    creating their own membership row at world creation.
drop policy if exists "Users can join worlds they are invited to or public worlds" on public.world_members;
drop policy if exists "Users can join public worlds or worlds they own" on public.world_members;

create policy "Users can join public worlds or worlds they own"
  on public.world_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.worlds w
      where w.id = world_id and (w.is_public or w.owner_id = auth.uid())
    )
  );
