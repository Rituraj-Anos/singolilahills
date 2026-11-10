-- ==============================================================================
-- 02: content management + locked-down security
-- Run after 01_initial_schema.sql (Supabase dashboard > SQL editor, or `supabase db push`).
-- Safe to re-run: every statement is idempotent.
-- ==============================================================================

-- ---------- Admins: only users listed here can edit anything ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Existing tables: new columns ----------
alter table public.packages alter column id set default gen_random_uuid()::text;
alter table public.packages add column if not exists published boolean not null default true;
alter table public.packages add column if not exists sort_order integer not null default 0;

alter table public.reviews alter column id set default gen_random_uuid()::text;
alter table public.reviews add column if not exists published boolean not null default false;
alter table public.reviews drop constraint if exists reviews_rating_check;
alter table public.reviews add constraint reviews_rating_check check (rating between 1 and 5);

alter table public.reels alter column id set default gen_random_uuid()::text;
alter table public.reels add column if not exists published boolean not null default true;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reels' and column_name = 'display_order') then
    alter table public.reels rename column display_order to sort_order;
  end if;
end $$;
alter table public.reels add column if not exists sort_order integer not null default 0;

alter table public.inquiries add column if not exists admin_notes text;
alter table public.inquiries add column if not exists updated_at timestamptz not null default now();
alter table public.inquiries drop constraint if exists inquiries_status_check;
alter table public.inquiries add constraint inquiries_status_check check (status in ('new', 'contacted', 'booked', 'closed'));
alter table public.inquiries drop constraint if exists inquiries_lengths_check;
alter table public.inquiries add constraint inquiries_lengths_check check (
  char_length(name) between 2 and 80 and char_length(phone) between 7 and 20
  and coalesce(char_length(email), 0) <= 120 and coalesce(char_length(notes), 0) <= 1500
);

-- ---------- New content tables ----------
create table if not exists public.destinations (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tagline text,
  hero_image text,
  description text,
  best_time text,
  altitude text,
  attractions jsonb not null default '[]'::jsonb,
  circuits jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  image text,
  content text not null default '',
  category text,
  author text,
  read_time text,
  published_at date not null default current_date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id text primary key default gen_random_uuid()::text,
  question text not null,
  answer text not null,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (char_length(email) <= 120),
  created_at timestamptz not null default now()
);

-- updated_at triggers on every editable table
do $$
declare t text;
begin
  foreach t in array array['packages', 'destinations', 'posts', 'faqs', 'site_settings', 'inquiries'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

create index if not exists inquiries_status_created on public.inquiries (status, created_at desc);
create index if not exists packages_published_order on public.packages (published, sort_order);
create index if not exists posts_published_date on public.posts (published, published_at desc);

-- ---------- Row Level Security ----------
alter table public.destinations enable row level security;
alter table public.posts enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.subscribers enable row level security;

-- drop the old wide-open policies from 01
drop policy if exists "Allow public read packages" on public.packages;
drop policy if exists "Allow public read reviews" on public.reviews;
drop policy if exists "Allow public read reels" on public.reels;
drop policy if exists "Allow public insert inquiries" on public.inquiries;
drop policy if exists "Allow admin all packages" on public.packages;
drop policy if exists "Allow admin all inquiries" on public.inquiries;
drop policy if exists "Allow admin all reviews" on public.reviews;
drop policy if exists "Allow admin all reels" on public.reels;

-- public sees published content only; admins see and edit everything
do $$
declare t text;
begin
  foreach t in array array['packages', 'destinations', 'posts', 'faqs', 'reviews', 'reels'] loop
    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select using (published or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);
drop policy if exists "admin write settings" on public.site_settings;
create policy "admin write settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- leads and subscribers: no public access at all. The website writes them through /api with the service role key.
drop policy if exists "admin manage inquiries" on public.inquiries;
create policy "admin manage inquiries" on public.inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage subscribers" on public.subscribers;
create policy "admin manage subscribers" on public.subscribers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage: public "media" bucket, admins upload ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------- Make someone an admin (run once per person, after they exist in Authentication > Users) ----------
-- insert into public.admins (user_id, name)
-- select id, 'Owner' from auth.users where email = 'owner@example.com'
-- on conflict do nothing;
