-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  parent_id   uuid references files(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('file', 'folder')),
  content     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists files_project_id_idx on files(project_id);
create index if not exists files_parent_id_idx on files(parent_id);

-- Phase 1 has no auth yet, so RLS is left open for the anon key.
-- Revisit this policy when auth is introduced in a later phase.
alter table projects enable row level security;
alter table files enable row level security;

create policy "allow all on projects" on projects for all using (true) with check (true);
create policy "allow all on files" on files for all using (true) with check (true);
