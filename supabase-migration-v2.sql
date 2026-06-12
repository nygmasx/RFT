-- ============================================================
-- MIGRATION v2 — Inscription avec validation coach
-- Run this in Supabase > SQL Editor
-- ============================================================

-- Ajoute le statut au profil
alter table profiles
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

-- Bucket avatars (public pour les URLs directes)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique des avatars
create policy "Avatars publics"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload de son propre avatar
create policy "Upload son avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Mise à jour de son propre avatar
create policy "Modifier son avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Le coach voit tous les profils en attente
create policy "Coach voit les profils en attente"
  on profiles for select to authenticated
  using (
    status = 'approved' OR
    id = (select auth.uid()) OR
    (select (auth.jwt()->'app_metadata'->>'role')) = 'coach'
  );

-- Drop l'ancienne policy trop permissive
drop policy if exists "Membres peuvent voir tous les profils" on profiles;
