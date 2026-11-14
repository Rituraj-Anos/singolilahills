-- ==============================================================================
-- 08: clients and invoices. Run after 07_customiser.sql. Safe to re-run.
-- Everything here is private: only admins can read or write it. The public invoice link
-- (/invoice/<token>) is served by the website's server, never read directly by visitors.
-- The rules that keep the books honest live in the database, so no screen can skip them:
--   * invoice numbers come from issue_invoice(), one series per financial year, no gaps or repeats
--   * an issued invoice can't be edited or deleted, only voided (and a void invoice stays void)
--   * the paid amount and the status follow the payments recorded, and a payment can't exceed the balance
-- ==============================================================================

-- ---------- Clients ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  -- the last 10 digits, so +91 98300 12345, 098300 12345 and 9830012345 are the same person
  phone_key text generated always as (nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10), '')) stored,
  email text check (email is null or char_length(email) <= 120),
  email_key text generated always as (nullif(lower(btrim(coalesce(email, ''))), '')) stored,
  address text check (address is null or char_length(address) <= 400),
  gstin text check (gstin is null or char_length(gstin) <= 20),
  tags text[] not null default '{}',
  preferences text check (preferences is null or char_length(preferences) <= 1000),
  notes text check (notes is null or char_length(notes) <= 4000),
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clients_phone_key on public.clients (phone_key) where phone_key is not null;
create index if not exists clients_email_key on public.clients (email_key) where email_key is not null;

alter table public.inquiries add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists inquiries_client on public.inquiries (client_id, created_at desc);

-- Finds the client for a phone number (falling back to email), or creates one.
create or replace function public.client_for(p_name text, p_phone text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := nullif(right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10), '');
  e text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  cid uuid;
begin
  if k is not null then
    select id into cid from clients where phone_key = k;
  end if;
  if cid is null and e is not null then
    select id into cid from clients where email_key = e order by created_at limit 1;
  end if;
  if cid is null then
    insert into clients (name, phone, email)
    values (coalesce(nullif(btrim(p_name), ''), 'Unknown'), nullif(btrim(p_phone), ''), nullif(btrim(p_email), ''))
    on conflict (phone_key) where phone_key is not null do update set updated_at = now()
    returning id into cid;
  else
    update clients set email = coalesce(email, nullif(btrim(p_email), '')) where id = cid and email is null and e is not null;
  end if;
  return cid;
end $$;
revoke all on function public.client_for(text, text, text) from public, anon, authenticated;

-- Every new enquiry is linked to its client. A problem here must never lose the enquiry, so errors are swallowed.
create or replace function public.link_inquiry_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is null then
    begin
      new.client_id := public.client_for(new.name, new.phone, new.email);
    exception when others then
      new.client_id := null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists link_client on public.inquiries;
create trigger link_client before insert on public.inquiries for each row execute function public.link_inquiry_client();

-- Link the enquiries that already exist, oldest first, so the first name given is the one kept.
do $$
declare r record;
begin
  for r in select id, name, phone, email from public.inquiries where client_id is null order by created_at loop
    update public.inquiries set client_id = public.client_for(r.name, r.phone, r.email) where id = r.id;
  end loop;
end $$;

-- ---------- Invoices ----------
create table if not exists public.business_profile (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.business_profile (id) values (1) on conflict (id) do nothing;

create table if not exists public.invoice_catalog (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  -- 64 random hex characters for the shareable link; long enough that it can't be guessed
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  number text unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'partly_paid', 'paid', 'void')),
  client_id uuid references public.clients (id) on delete restrict,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  issue_date date,
  due_date date,
  currency text not null default 'INR',
  tax_mode text not null default 'exclusive' check (tax_mode in ('exclusive', 'inclusive')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  terms text check (terms is null or char_length(terms) <= 4000),
  payment_details text check (payment_details is null or char_length(payment_details) <= 1000),
  client_snapshot jsonb,
  business_snapshot jsonb,
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0 check (total >= 0),
  paid_total numeric(14, 2) not null default 0,
  issued_at timestamptz,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or number is not null)
);
create index if not exists invoices_status_date on public.invoices (status, issue_date desc);
create index if not exists invoices_client on public.invoices (client_id);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null default 'upi' check (method in ('upi', 'bank', 'cash', 'card', 'other')),
  reference text check (reference is null or char_length(reference) <= 120),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists invoice_payments_invoice on public.invoice_payments (invoice_id, paid_on);

create table if not exists public.invoice_counters (
  series text primary key,
  last_number integer not null default 0
);

-- Issued invoices are frozen. Status and paid amount only change through payments, issuing or voiding.
create or replace function public.guard_invoice()
returns trigger
language plpgsql
as $$
declare
  issuing boolean := coalesce(current_setting('app.invoice_issue', true), '') = 'on';
  syncing boolean := coalesce(current_setting('app.invoice_sync', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'An issued invoice can''t be deleted. Void it instead.';
    end if;
    return old;
  end if;

  if old.status = 'draft' then
    if (new.status <> 'draft' or new.number is not null) and not issuing then
      raise exception 'Use "Issue invoice" to issue a draft.';
    end if;
    if new.paid_total <> 0 then
      raise exception 'Payments can only be recorded on an issued invoice.';
    end if;
    return new;
  end if;

  if (new.number, new.token, new.issue_date, new.due_date, new.currency, new.tax_mode, new.items, new.notes, new.terms,
      new.payment_details, new.client_snapshot, new.business_snapshot, new.subtotal, new.tax_total, new.total, new.issued_at)
     is distinct from
     (old.number, old.token, old.issue_date, old.due_date, old.currency, old.tax_mode, old.items, old.notes, old.terms,
      old.payment_details, old.client_snapshot, old.business_snapshot, old.subtotal, old.tax_total, old.total, old.issued_at) then
    raise exception 'An issued invoice can''t be changed. Void it and issue a new one.';
  end if;
  if old.status = 'void' and (new.status <> 'void' or new.void_reason is distinct from old.void_reason) then
    raise exception 'A void invoice stays void.';
  end if;
  if new.paid_total is distinct from old.paid_total and not syncing then
    raise exception 'The paid amount follows the payments recorded.';
  end if;
  if new.status is distinct from old.status and new.status <> 'void' and not syncing then
    raise exception 'The status follows the payments recorded.';
  end if;
  if new.status = 'void' and old.status <> 'void' then
    new.voided_at := now();
  end if;
  return new;
end $$;
drop trigger if exists guard_invoice on public.invoices;
create trigger guard_invoice before update or delete on public.invoices for each row execute function public.guard_invoice();

-- Assigns the next number in the financial-year series and freezes the client and business details.
create or replace function public.issue_invoice(p_id uuid)
returns public.invoices
language plpgsql
security invoker
set search_path = public
as $$
declare
  inv invoices;
  c clients;
  b jsonb;
  d date;
  fy text;
  prefix text;
  series text;
  n integer;
  due_days integer;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select * into inv from invoices where id = p_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if inv.status <> 'draft' then
    raise exception 'This invoice is already issued.';
  end if;
  if inv.client_id is null then
    raise exception 'Choose who the invoice is for first.';
  end if;
  if jsonb_array_length(inv.items) = 0 or inv.total <= 0 then
    raise exception 'Add at least one line with an amount.';
  end if;

  select * into c from clients where id = inv.client_id;
  select coalesce(data, '{}'::jsonb) into b from business_profile where id = 1;
  b := coalesce(b, '{}'::jsonb);
  d := coalesce(inv.issue_date, (now() at time zone 'Asia/Kolkata')::date);
  fy := case
    when extract(month from d) >= 4 then to_char(d, 'YYYY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YYYY') || '-' || to_char(d, 'YY')
  end;
  prefix := upper(coalesce(nullif(regexp_replace(coalesce(b->>'invoice_prefix', ''), '[^A-Za-z0-9-]', '', 'g'), ''), 'SH'));
  series := prefix || '/' || fy;
  due_days := case when coalesce(b->>'due_days', '') ~ '^[0-9]{1,3}$' then (b->>'due_days')::int else 7 end;

  insert into invoice_counters (series, last_number) values (series, 1)
  on conflict on constraint invoice_counters_pkey do update set last_number = invoice_counters.last_number + 1
  returning last_number into n;

  perform set_config('app.invoice_issue', 'on', true);
  update invoices set
    status = 'issued',
    number = series || '/' || lpad(n::text, 4, '0'),
    issue_date = d,
    due_date = coalesce(due_date, d + due_days),
    issued_at = now(),
    payment_details = coalesce(nullif(btrim(payment_details), ''), b->>'payment_details'),
    terms = coalesce(nullif(btrim(terms), ''), b->>'terms'),
    client_snapshot = jsonb_strip_nulls(jsonb_build_object('name', c.name, 'phone', c.phone, 'email', c.email, 'address', c.address, 'gstin', c.gstin)),
    business_snapshot = b - 'due_days' - 'payment_details' - 'terms'
  where id = p_id
  returning * into inv;
  perform set_config('app.invoice_issue', '', true);
  return inv;
end $$;
revoke all on function public.issue_invoice(uuid) from public, anon;
grant execute on function public.issue_invoice(uuid) to authenticated;

-- Payments: only on issued invoices, never more than the balance; the invoice follows the total paid.
create or replace function public.check_invoice_payment()
returns trigger
language plpgsql
as $$
declare inv invoices;
begin
  select * into inv from invoices where id = new.invoice_id for update;
  if inv.status not in ('issued', 'partly_paid') then
    raise exception 'Payments can only be recorded on an issued invoice that is not fully paid or void.';
  end if;
  if new.amount > inv.total - inv.paid_total then
    raise exception 'That is more than the balance due (%).', inv.total - inv.paid_total;
  end if;
  return new;
end $$;
drop trigger if exists check_payment on public.invoice_payments;
create trigger check_payment before insert on public.invoice_payments for each row execute function public.check_invoice_payment();

create or replace function public.sync_invoice_paid()
returns trigger
language plpgsql
as $$
declare
  iid uuid := coalesce(new.invoice_id, old.invoice_id);
  paid numeric;
begin
  select coalesce(sum(amount), 0) into paid from invoice_payments where invoice_id = iid;
  perform set_config('app.invoice_sync', 'on', true);
  update invoices set
    paid_total = paid,
    status = case
      when status in ('void', 'draft') then status
      when paid >= total then 'paid'
      when paid > 0 then 'partly_paid'
      else 'issued'
    end
  where id = iid;
  perform set_config('app.invoice_sync', '', true);
  return null;
end $$;
drop trigger if exists sync_paid on public.invoice_payments;
create trigger sync_paid after insert or update or delete on public.invoice_payments for each row execute function public.sync_invoice_paid();

-- Merge a duplicate client into another: enquiries and invoices move across, tags and notes are combined.
create or replace function public.merge_clients(p_keep uuid, p_dup uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare d clients;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if p_keep = p_dup then
    raise exception 'Pick two different clients.';
  end if;
  select * into d from clients where id = p_dup for update;
  if not found then
    raise exception 'Client not found.';
  end if;
  update inquiries set client_id = p_keep where client_id = p_dup;
  update invoices set client_id = p_keep where client_id = p_dup;
  delete from clients where id = p_dup;
  update clients k set
    phone = coalesce(k.phone, d.phone),
    email = coalesce(k.email, d.email),
    address = coalesce(k.address, d.address),
    gstin = coalesce(k.gstin, d.gstin),
    tags = array(select distinct t from unnest(k.tags || d.tags) as t order by t),
    preferences = nullif(concat_ws(E'\n', nullif(k.preferences, ''), nullif(d.preferences, '')), ''),
    notes = nullif(concat_ws(E'\n\n', nullif(k.notes, ''), nullif(d.notes, '')), ''),
    follow_up_on = least(k.follow_up_on, d.follow_up_on)
  where k.id = p_keep;
end $$;
revoke all on function public.merge_clients(uuid, uuid) from public, anon;
grant execute on function public.merge_clients(uuid, uuid) to authenticated;

-- ---------- updated_at and Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['clients', 'invoices', 'invoice_catalog', 'business_profile'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
  foreach t in array array['clients', 'invoices', 'invoice_payments', 'invoice_counters', 'invoice_catalog', 'business_profile'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin manage" on public.%I', t);
    execute format('create policy "admin manage" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
