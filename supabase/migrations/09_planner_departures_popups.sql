-- ==============================================================================
-- 09: editable planner questions, dated departures and pop-ups. Run after 08_clients_invoices.sql.
-- Safe to re-run. The planner's built-in questions are copied in once and never overwritten.
-- ==============================================================================

-- ---------- Planner questions ----------
create table if not exists public.planner_questions (
  id text primary key default gen_random_uuid()::text,
  key text unique not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 40),
  -- set on the built-in questions that feed the trip matching; empty on the owner's own questions
  maps_to text unique check (maps_to is null or maps_to in ('destinations', 'month', 'length', 'travelling', 'group', 'budget', 'interests')),
  type text not null default 'single' check (type in ('single', 'multi', 'text', 'number', 'date', 'destinations')),
  title text not null check (char_length(title) between 2 and 160),
  help text check (help is null or char_length(help) <= 400),
  required boolean not null default false,
  with_previous boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 30),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.planner_questions (id, key, maps_to, type, title, help, with_previous, sort_order) values
  ('pq-destinations', 'destinations', 'destinations', 'destinations', 'Where do you want to go?', 'Pick one or more places. Skip this if you are not sure yet.', false, 0),
  ('pq-month', 'month', 'month', 'single', 'When are you thinking of travelling?', 'A rough month is enough.', false, 10),
  ('pq-length', 'length', 'length', 'single', 'How long?', '', true, 20),
  ('pq-travelling', 'travelling', 'travelling', 'single', 'Who is coming?', 'This helps us suggest the right pace and altitude.', false, 30),
  ('pq-group', 'group', 'group', 'number', 'How many of you?', '', true, 40),
  ('pq-budget', 'budget', 'budget', 'single', 'What is your budget per person?', 'It covers transport, stays, permits and most meals on the route.', false, 50),
  ('pq-interests', 'interests', 'interests', 'multi', 'What do you enjoy?', 'Pick as many as you like.', false, 60)
on conflict (id) do nothing;

-- ---------- Departures ----------
create table if not exists public.departures (
  id text primary key default gen_random_uuid()::text,
  trip_slug text not null check (trip_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  start_date date not null,
  end_date date not null,
  price numeric(12, 0) check (price is null or price >= 0),
  seats_total integer check (seats_total is null or seats_total between 1 and 500),
  seats_left integer check (seats_left is null or seats_left >= 0),
  status text not null default 'open' check (status in ('open', 'filling', 'sold_out', 'cancelled')),
  note text check (note is null or char_length(note) <= 200),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (seats_left is null or seats_total is null or seats_left <= seats_total)
);
create index if not exists departures_upcoming on public.departures (published, start_date);

-- ---------- Pop-ups ----------
create table if not exists public.popups (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 2 and 120),
  text text check (text is null or char_length(text) <= 600),
  image text,
  badge text check (badge is null or char_length(badge) <= 30),
  button_label text check (button_label is null or char_length(button_label) <= 40),
  link_type text not null default 'url' check (link_type in ('url', 'trip', 'departure', 'whatsapp')),
  link_url text check (link_url is null or char_length(link_url) <= 500),
  link_trip text,
  link_departure text,
  starts_on date,
  ends_on date,
  pages text not null default 'all' check (pages in ('all', 'home', 'chosen')),
  page_paths text[] not null default '{}',
  delay_seconds integer not null default 3 check (delay_seconds between 0 and 120),
  frequency text not null default 'daily' check (frequency in ('every', 'daily', 'once')),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- ---------- Enquiries: every planner answer, and the date picked ----------
alter table public.inquiries add column if not exists planner_answers jsonb;
alter table public.inquiries add column if not exists departure_id text references public.departures (id) on delete set null;

-- ---------- updated_at and Row Level Security (public reads what is shown, admins edit) ----------
do $$
declare t text;
begin
  foreach t in array array['planner_questions', 'departures', 'popups'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select using (published or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
