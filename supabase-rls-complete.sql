-- ============================================================
-- RLS COMPLET — Ronin Fight Team
-- Remplace toutes les policies existantes
-- Run this in Supabase > SQL Editor
-- ============================================================

-- Helper : vérifie si l'utilisateur est coach
create or replace function is_coach()
returns boolean language sql security definer stable
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'coach', false)
$$;

-- Helper : vérifie si le profil est approuvé
create or replace function is_approved()
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from profiles
    where id = (select auth.uid()) and status = 'approved'
  )
$$;

-- ── DROP toutes les policies existantes ──────────────────────

do $$ declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ── PROFILES ─────────────────────────────────────────────────

-- Lecture : son propre profil OU profils approuvés OU coach voit tout
create policy "profiles_select"
  on profiles for select to authenticated
  using (
    id = (select auth.uid())
    or status = 'approved'
    or is_coach()
  );

-- Insertion : uniquement son propre profil (trigger handle_new_user)
create policy "profiles_insert"
  on profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- Mise à jour : son propre profil OU coach peut tout modifier
create policy "profiles_update"
  on profiles for update to authenticated
  using (id = (select auth.uid()) or is_coach())
  with check (id = (select auth.uid()) or is_coach());

-- ── BELT RECORDS ─────────────────────────────────────────────

create policy "belt_select"
  on belt_records for select to authenticated
  using (user_id = (select auth.uid()) or is_coach());

create policy "belt_insert"
  on belt_records for insert to authenticated
  with check (user_id = (select auth.uid()) or is_coach());

create policy "belt_update"
  on belt_records for update to authenticated
  using (user_id = (select auth.uid()) or is_coach());

create policy "belt_delete"
  on belt_records for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── CHANNELS ─────────────────────────────────────────────────

-- Lecture : salons publics accessibles à tous les membres approuvés
-- Salons privés : uniquement les membres du salon
create policy "channels_select"
  on channels for select to authenticated
  using (
    is_coach()
    or (not is_private)
    or exists (
      select 1 from channel_members cm
      where cm.channel_id = channels.id
        and cm.user_id = (select auth.uid())
    )
  );

-- Création : tout membre approuvé peut créer un salon
create policy "channels_insert"
  on channels for insert to authenticated
  with check (is_approved() or is_coach());

-- Modification : coach uniquement
create policy "channels_update"
  on channels for update to authenticated
  using (is_coach());

-- ── CHANNEL MEMBERS ──────────────────────────────────────────

create policy "channel_members_select"
  on channel_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_coach()
    or exists (
      select 1 from channel_members cm
      where cm.channel_id = channel_members.channel_id
        and cm.user_id = (select auth.uid())
    )
  );

create policy "channel_members_insert"
  on channel_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or is_coach()
  );

create policy "channel_members_delete"
  on channel_members for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── MESSAGES ─────────────────────────────────────────────────

create policy "messages_select"
  on messages for select to authenticated
  using (
    is_coach()
    or exists (
      select 1 from channels c
      where c.id = messages.channel_id
        and (
          not c.is_private
          or exists (
            select 1 from channel_members cm
            where cm.channel_id = c.id
              and cm.user_id = (select auth.uid())
          )
        )
    )
  );

create policy "messages_insert"
  on messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      is_coach()
      or exists (
        select 1 from channels c
        where c.id = messages.channel_id
          and (
            not c.is_locked
            and (
              not c.is_private
              or exists (
                select 1 from channel_members cm
                where cm.channel_id = c.id
                  and cm.user_id = (select auth.uid())
              )
            )
          )
      )
    )
  );

create policy "messages_delete"
  on messages for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── ANNOUNCEMENTS ────────────────────────────────────────────

create policy "announcements_select"
  on announcements for select to authenticated
  using (is_approved() or is_coach());

create policy "announcements_insert"
  on announcements for insert to authenticated
  with check (is_coach());

create policy "announcements_update"
  on announcements for update to authenticated
  using (is_coach());

create policy "announcements_delete"
  on announcements for delete to authenticated
  using (is_coach());

-- ── CALENDAR EVENTS ──────────────────────────────────────────

create policy "calendar_events_select"
  on calendar_events for select to authenticated
  using (is_approved() or is_coach());

create policy "calendar_events_insert"
  on calendar_events for insert to authenticated
  with check (is_coach());

create policy "calendar_events_update"
  on calendar_events for update to authenticated
  using (is_coach());

create policy "calendar_events_delete"
  on calendar_events for delete to authenticated
  using (is_coach());

-- ── COMPETITIONS ─────────────────────────────────────────────

create policy "competitions_select"
  on competitions for select to authenticated
  using (is_approved() or is_coach());

create policy "competitions_insert"
  on competitions for insert to authenticated
  with check (is_coach());

create policy "competitions_update"
  on competitions for update to authenticated
  using (is_coach());

-- ── REGISTRATIONS ────────────────────────────────────────────

create policy "registrations_select"
  on registrations for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_coach()
  );

create policy "registrations_insert"
  on registrations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (is_approved() or is_coach())
  );

create policy "registrations_update"
  on registrations for update to authenticated
  using (user_id = (select auth.uid()) or is_coach());

create policy "registrations_delete"
  on registrations for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── CARPOOLS ─────────────────────────────────────────────────

create policy "carpools_select"
  on carpools for select to authenticated
  using (is_approved() or is_coach());

create policy "carpools_insert"
  on carpools for insert to authenticated
  with check (
    driver_id = (select auth.uid())
    and (is_approved() or is_coach())
  );

create policy "carpools_update"
  on carpools for update to authenticated
  using (driver_id = (select auth.uid()) or is_coach());

create policy "carpools_delete"
  on carpools for delete to authenticated
  using (driver_id = (select auth.uid()) or is_coach());

-- ── CARPOOL PASSENGERS ───────────────────────────────────────

create policy "carpool_passengers_select"
  on carpool_passengers for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_coach()
    or exists (
      select 1 from carpools c
      where c.id = carpool_passengers.carpool_id
        and c.driver_id = (select auth.uid())
    )
  );

create policy "carpool_passengers_insert"
  on carpool_passengers for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (is_approved() or is_coach())
  );

create policy "carpool_passengers_delete"
  on carpool_passengers for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── PALMARES ─────────────────────────────────────────────────

create policy "palmares_select"
  on palmares for select to authenticated
  using (user_id = (select auth.uid()) or is_approved() or is_coach());

create policy "palmares_insert"
  on palmares for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (is_approved() or is_coach())
  );

create policy "palmares_update"
  on palmares for update to authenticated
  using (user_id = (select auth.uid()) or is_coach());

create policy "palmares_delete"
  on palmares for delete to authenticated
  using (user_id = (select auth.uid()) or is_coach());

-- ── PUSH TOKENS ──────────────────────────────────────────────

create policy "push_tokens_all"
  on push_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── STORAGE — Avatars ─────────────────────────────────────────

drop policy if exists "Avatars publics" on storage.objects;
drop policy if exists "Upload son avatar" on storage.objects;
drop policy if exists "Modifier son avatar" on storage.objects;

create policy "avatars_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
