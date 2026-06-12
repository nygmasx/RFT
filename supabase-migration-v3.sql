-- ============================================================
-- MIGRATION v3 — Push notifications
-- Run this in Supabase > SQL Editor
-- ============================================================

-- Table des tokens push
create table if not exists push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  created_at timestamptz default now(),
  unique (user_id, token)
);
alter table push_tokens enable row level security;

create policy "Upsert son propre token"
  on push_tokens for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Les coachs peuvent lire tous les tokens (pour envoyer les notifs)
-- Note: en pratique l'Edge Function utilise la service_role, pas besoin de policy ici
