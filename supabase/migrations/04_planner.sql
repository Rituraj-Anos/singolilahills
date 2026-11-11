-- ==============================================================================
-- 04: trip planner. Matching data on trips, structured requests on enquiries.
-- Run after 03_review_submissions.sql. Safe to re-run.
-- ==============================================================================

-- Trips: what the planner matches on (editable per trip in the admin)
alter table public.packages add column if not exists months integer[] not null default '{}';
alter table public.packages add column if not exists suitable_for text[] not null default '{}';
alter table public.packages add column if not exists interests text[] not null default '{}';
alter table public.packages drop constraint if exists packages_months_check;
alter table public.packages add constraint packages_months_check check (months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]);

-- Enquiries: the answers from the planner
alter table public.inquiries add column if not exists destinations text[] not null default '{}';
alter table public.inquiries add column if not exists travel_month date;
alter table public.inquiries add column if not exists trip_length text;
alter table public.inquiries add column if not exists adults integer;
alter table public.inquiries add column if not exists children integer not null default 0;
alter table public.inquiries add column if not exists travelling_with text;
alter table public.inquiries add column if not exists budget_label text;
alter table public.inquiries add column if not exists interests text[] not null default '{}';
alter table public.inquiries add column if not exists matched_trips text[] not null default '{}';
alter table public.inquiries add column if not exists follow_up_on date;

alter table public.inquiries drop constraint if exists inquiries_planner_check;
alter table public.inquiries add constraint inquiries_planner_check check (
  (trip_length is null or trip_length in ('short', 'medium', 'long', 'flexible'))
  and (travelling_with is null or travelling_with in ('solo', 'couple', 'family', 'friends', 'seniors'))
  and (adults is null or adults between 1 and 30)
  and children between 0 and 30
  and (travel_month is null or extract(day from travel_month) = 1)
  and (budget_label is null or char_length(budget_label) <= 60)
  and cardinality(destinations) <= 8 and cardinality(interests) <= 8 and cardinality(matched_trips) <= 8
);

create index if not exists inquiries_follow_up on public.inquiries (follow_up_on) where status in ('new', 'contacted');
create index if not exists inquiries_phone_recent on public.inquiries (phone, created_at desc);
