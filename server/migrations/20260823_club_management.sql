BEGIN;

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS family_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  category text,
  avatar_url text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES seasons(id) ON DELETE SET NULL,
  coach_id text REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  discipline text NOT NULL DEFAULT 'BJJ',
  category text,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  place text,
  capacity integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled',
  trial_allowed boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (capacity BETWEEN 1 AND 500),
  CHECK (status IN ('scheduled', 'cancelled', 'completed'))
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  family_profile_id uuid REFERENCES family_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'booked',
  checked_in_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK ((user_id IS NOT NULL) <> (family_profile_id IS NOT NULL)),
  CHECK (status IN ('booked', 'waitlist', 'cancelled', 'attended', 'absent'))
);

CREATE UNIQUE INDEX IF NOT EXISTS class_bookings_session_user_unique
  ON class_bookings (session_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS class_bookings_session_family_unique
  ON class_bookings (session_id, family_profile_id) WHERE family_profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS trial_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (status IN ('registered', 'attended', 'absent', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  billing_interval text NOT NULL DEFAULT 'season',
  checkout_url text,
  features text NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (price_cents >= 0),
  CHECK (billing_interval IN ('once', 'month', 'quarter', 'year', 'season'))
);

CREATE TABLE IF NOT EXISTS member_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL,
  end_date date,
  next_payment_date date,
  balance_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'active', 'paused', 'expired', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES member_memberships(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  paid_at timestamp,
  reference text,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (amount_cents >= 0),
  CHECK (method IN ('cash', 'card', 'transfer', 'cheque', 'online', 'manual')),
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE TABLE IF NOT EXISTS member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_data text NOT NULL,
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_on date,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (category IN ('license', 'medical', 'insurance', 'identity', 'contract', 'other'))
);

CREATE UNIQUE INDEX IF NOT EXISTS member_documents_access_token_unique
  ON member_documents (access_token);

CREATE TABLE IF NOT EXISTS join_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  fields text NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS join_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES join_forms(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  answers text NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (status IN ('new', 'contacted', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS club_profile (
  id text PRIMARY KEY DEFAULT 'rft',
  name text NOT NULL DEFAULT 'Ronin Fight Team',
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  website text,
  disciplines text NOT NULL DEFAULT '[]',
  schedule_summary text,
  join_button_label text NOT NULL DEFAULT 'Rejoindre le club',
  join_form_id uuid REFERENCES join_forms(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (status IN ('draft', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS class_sessions_date_idx ON class_sessions (session_date, start_time);
CREATE INDEX IF NOT EXISTS class_bookings_session_idx ON class_bookings (session_id, status);
CREATE INDEX IF NOT EXISTS member_memberships_user_idx ON member_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_documents_user_idx ON member_documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS join_submissions_status_idx ON join_submissions (status, created_at DESC);

INSERT INTO club_profile (id, name, description, email, disciplines)
VALUES (
  'rft',
  'Ronin Fight Team',
  'Club de sports de combat à Montataire, Oise.',
  'contact@roninbjj.fr',
  '["BJJ","NO-GI","Grappling"]'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
