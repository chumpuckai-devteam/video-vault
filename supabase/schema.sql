create extension if not exists "uuid-ossp";

create table if not exists videos (
  id uuid primary key default uuid_generate_v4(),
  title text,
  drive_file_id text not null,
  drive_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists video_tokens (
  token uuid primary key,
  video_id uuid references videos(id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists google_drive_tokens (
  id text primary key,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz
);

create index if not exists idx_video_tokens_video_id on video_tokens(video_id);
