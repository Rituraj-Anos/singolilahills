-- ==============================================================================
-- 03: traveller-submitted reviews, held for the owner to approve
-- Run after 02_cms_and_security.sql. Safe to re-run.
-- ==============================================================================

create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  author text not null check (char_length(author) between 2 and 60),
  location text check (char_length(location) <= 60),
  trip text check (char_length(trip) <= 160),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 20 and 800),
  contact text check (char_length(contact) <= 120), -- private: only admins can read this table
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists review_submissions_status_created on public.review_submissions (status, created_at desc);

alter table public.review_submissions enable row level security;
drop policy if exists "admin manage review submissions" on public.review_submissions;
create policy "admin manage review submissions" on public.review_submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- no public policy at all: the website saves submissions through /api/review with the service role key

-- Approve = copy into the public reviews table and mark the submission done, in one transaction.
create or replace function public.approve_review_submission(sub_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.review_submissions;
  new_id text;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select * into s from public.review_submissions where id = sub_id and status = 'new' for update;
  if not found then
    raise exception 'submission not found or already handled';
  end if;
  insert into public.reviews (author, location, circuit, rating, date, comment, published)
  values (s.author, s.location, s.trip, s.rating, to_char(now(), 'FMMonth YYYY'), s.comment, true)
  returning id into new_id;
  update public.review_submissions set status = 'approved' where id = sub_id;
  return new_id;
end $$;
revoke all on function public.approve_review_submission(uuid) from public;
grant execute on function public.approve_review_submission(uuid) to authenticated;
