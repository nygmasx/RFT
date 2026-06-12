-- ============================================================
-- RONIN FIGHT TEAM — Supabase Schema
-- Run this in Supabase > SQL Editor
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  member_id     text unique,
  category      text default 'Adultes',
  weight_class  text,
  stance        text,
  phone         text,
  avatar_url    text,
  joined_at     timestamptz default now()
);
alter table profiles enable row level security;

create policy "Membres peuvent voir tous les profils"
  on profiles for select to authenticated
  using (true);

create policy "Membres peuvent modifier leur propre profil"
  on profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Insertion auto du profil à l'inscription"
  on profiles for insert to authenticated
  with check ((select auth.uid()) = id);

-- ── BELT RECORDS ─────────────────────────────────────────────
create table belt_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  color         text not null check (color in ('blanche','bleue','violette','marron','noire')),
  stripes       int  not null default 0 check (stripes between 0 and 4),
  promoted_by   text,
  promoted_date date,
  created_at    timestamptz default now()
);
alter table belt_records enable row level security;

create policy "Lecture propre ceinture"
  on belt_records for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Modification propre ceinture"
  on belt_records for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── CHANNELS ─────────────────────────────────────────────────
create table channels (
  id            text primary key,
  name          text not null,
  description   text,
  is_private    boolean default false,
  is_locked     boolean default false,
  created_at    timestamptz default now()
);
alter table channels enable row level security;

create policy "Lecture des salons publics"
  on channels for select to authenticated
  using (not is_private);

-- ── CHANNEL MEMBERS ──────────────────────────────────────────
create table channel_members (
  channel_id    text not null references channels(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  primary key (channel_id, user_id)
);
alter table channel_members enable row level security;

create policy "Voir les membres de ses salons"
  on channel_members for select to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from channel_members cm
      where cm.channel_id = channel_members.channel_id
        and cm.user_id = (select auth.uid())
    )
  );

-- ── MESSAGES ─────────────────────────────────────────────────
create table messages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    text not null references channels(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  body          text not null,
  created_at    timestamptz default now()
);
alter table messages enable row level security;
create index on messages (channel_id, created_at desc);

create policy "Lecture messages des salons accessibles"
  on messages for select to authenticated
  using (
    exists (
      select 1 from channels c
      where c.id = messages.channel_id
        and (not c.is_private or exists (
          select 1 from channel_members cm
          where cm.channel_id = c.id and cm.user_id = (select auth.uid())
        ))
    )
  );

create policy "Envoi de messages dans les salons accessibles"
  on messages for insert to authenticated
  with check (
    user_id = (select auth.uid()) and
    exists (
      select 1 from channels c
      where c.id = messages.channel_id
        and (not c.is_private or exists (
          select 1 from channel_members cm
          where cm.channel_id = c.id and cm.user_id = (select auth.uid())
        ))
    )
  );

-- ── ANNOUNCEMENTS ────────────────────────────────────────────
create table announcements (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references profiles(id),
  tag           text,
  title         text not null,
  body          text not null,
  pinned        boolean default false,
  created_at    timestamptz default now()
);
alter table announcements enable row level security;

create policy "Tous les membres voient les annonces"
  on announcements for select to authenticated
  using (true);

create policy "Seuls les coachs créent des annonces"
  on announcements for insert to authenticated
  with check (
    (select (auth.jwt()->'app_metadata'->>'role')) = 'coach'
  );

-- ── CALENDAR EVENTS ──────────────────────────────────────────
create table calendar_events (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('cours','compet','stage')),
  title         text not null,
  event_date    date not null,
  event_time    time,
  place         text,
  created_at    timestamptz default now()
);
alter table calendar_events enable row level security;

create policy "Tous les membres voient le calendrier"
  on calendar_events for select to authenticated
  using (true);

-- ── COMPETITIONS ─────────────────────────────────────────────
create table competitions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  location      text,
  comp_date     date not null,
  category      text,
  comp_type     text check (comp_type in ('GI','NO-GI','OPEN')),
  registration_deadline date,
  status        text default 'open' check (status in ('open','soon','closed')),
  created_at    timestamptz default now()
);
alter table competitions enable row level security;

create policy "Tous les membres voient les compétitions"
  on competitions for select to authenticated
  using (true);

-- ── REGISTRATIONS ────────────────────────────────────────────
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  competition_id uuid not null references competitions(id) on delete cascade,
  weight_class  text,
  status        text default 'en_attente' check (status in ('confirmé','en_attente','annulé')),
  created_at    timestamptz default now(),
  unique (user_id, competition_id)
);
alter table registrations enable row level security;

create policy "Voir ses propres inscriptions"
  on registrations for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "S'inscrire à une compétition"
  on registrations for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Modifier sa propre inscription"
  on registrations for update to authenticated
  using ((select auth.uid()) = user_id);

-- ── CARPOOLS ─────────────────────────────────────────────────
create table carpools (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references profiles(id) on delete cascade,
  competition_id uuid references competitions(id),
  departure_city text not null,
  departure_at  timestamptz not null,
  seats_total   int not null check (seats_total > 0),
  seats_taken   int not null default 0,
  cost_per_seat numeric(6,2) default 0,
  notes         text,
  created_at    timestamptz default now()
);
alter table carpools enable row level security;
create index on carpools (competition_id);

create policy "Voir tous les covoiturages"
  on carpools for select to authenticated
  using (true);

create policy "Créer un covoiturage"
  on carpools for insert to authenticated
  with check ((select auth.uid()) = driver_id);

create policy "Conducteur peut modifier son covoiturage"
  on carpools for update to authenticated
  using ((select auth.uid()) = driver_id);

-- ── CARPOOL PASSENGERS ───────────────────────────────────────
create table carpool_passengers (
  carpool_id    uuid not null references carpools(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  primary key (carpool_id, user_id)
);
alter table carpool_passengers enable row level security;

create policy "Voir les passagers de ses trajets"
  on carpool_passengers for select to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from carpools c
      where c.id = carpool_passengers.carpool_id
        and c.driver_id = (select auth.uid())
    )
  );

create policy "Rejoindre un covoiturage"
  on carpool_passengers for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ── PALMARES ─────────────────────────────────────────────────
create table palmares (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  competition_name text not null,
  comp_date     date not null,
  weight_class  text,
  comp_type     text check (comp_type in ('GI','NO-GI')),
  place         int not null check (place between 1 and 4),
  notes         text,
  created_at    timestamptz default now()
);
alter table palmares enable row level security;

create policy "Voir son propre palmarès"
  on palmares for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Voir le palmarès des membres (si partagé)"
  on palmares for select to authenticated
  using (true);

create policy "Ajouter un résultat"
  on palmares for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Modifier son résultat"
  on palmares for update to authenticated
  using ((select auth.uid()) = user_id);

-- ── REALTIME ─────────────────────────────────────────────────
-- Activer le realtime sur les messages
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table announcements;

-- ── AUTO-CRÉATION DU PROFIL ──────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
