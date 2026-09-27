-- إنشاء كل جداول Eqraa من src/db/schema.ts
-- تشغيله مرة واحدة على قاعدة البيانات الفارغة

-- Enums
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');

-- Identity tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone_e164 TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  gender gender NOT NULL,
  avatar_key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar',
  theme TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'active',
  failed_pin_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE admin_roles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  role admin_role NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 30),
  start_date DATE NOT NULL,
  start_offset INTEGER NOT NULL DEFAULT 0 CHECK (start_offset BETWEEN 0 AND 29),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 30),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  left_reason TEXT,
  added_by UUID
);

CREATE UNIQUE INDEX gm_active_slot ON group_members(group_id, slot) WHERE left_at IS NULL;
CREATE UNIQUE INDEX gm_active_user ON group_members(user_id) WHERE left_at IS NULL;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayer times & Khatmah
CREATE TABLE prayer_times (
  date DATE PRIMARY KEY,
  fajr_at TIMESTAMPTZ NOT NULL,
  dhuhr_at TIMESTAMPTZ,
  asr_at TIMESTAMPTZ,
  maghrib_at TIMESTAMPTZ,
  isha_at TIMESTAMPTZ,
  source TEXT NOT NULL,
  is_override INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE khatmah_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  day_number INTEGER NOT NULL,
  local_date DATE NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  size_snapshot INTEGER NOT NULL
);

CREATE UNIQUE INDEX kd_group_date ON khatmah_days(group_id, local_date);

CREATE TABLE part_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  khatmah_day_id UUID NOT NULL REFERENCES khatmah_days(id),
  slot INTEGER NOT NULL,
  part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 30),
  primary_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'assigned'
);

CREATE UNIQUE INDEX pa_day_slot ON part_assignments(khatmah_day_id, slot);

CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_assignment_id UUID NOT NULL REFERENCES part_assignments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'primary',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'online',
  confirmed_by UUID,
  client_time TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  undone_at TIMESTAMPTZ,
  undone_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX rs_one_completion ON reading_sessions(part_assignment_id) 
  WHERE kind IN ('primary','backup') AND finished_at IS NOT NULL AND undone_at IS NULL;
CREATE UNIQUE INDEX rs_one_makeup ON reading_sessions(part_assignment_id) 
  WHERE kind = 'makeup' AND finished_at IS NOT NULL AND undone_at IS NULL;

-- Backup & Streak
CREATE TABLE backup_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_assignment_id UUID NOT NULL REFERENCES part_assignments(id),
  backup_user_id UUID NOT NULL REFERENCES users(id),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ba_one_active ON backup_assignments(part_assignment_id) WHERE cancelled_at IS NULL;

CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  protections INTEGER NOT NULL DEFAULT 0 CHECK (protections BETWEEN 0 AND 2),
  toward INTEGER NOT NULL DEFAULT 0,
  last_evaluated_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notification_templates (
  key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  editable_by_admin INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX nt_key_locale ON notification_templates(key, locale);

CREATE TABLE notification_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE notification_preferences (
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX np_user_type ON notification_preferences(user_id, type);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  device TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
