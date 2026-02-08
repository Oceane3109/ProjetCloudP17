create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null unique,
  password_hash varchar(255) not null,
  role varchar(32) not null,
  failed_login_attempts int not null default 0,
  locked boolean not null default false,
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  jti varchar(64) not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked boolean not null default false
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references users(id) on delete set null,
  title varchar(200) not null,
  description text null,
  latitude double precision not null,
  longitude double precision not null,
  status varchar(32) not null default 'NEW',
  surface_m2 numeric(12,2) null,
  budget_amount numeric(14,2) null,
  progress_percent int null,
  created_at timestamptz not null default now()
);

