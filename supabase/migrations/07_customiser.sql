-- ==============================================================================
-- 07: "Make it yours" on trip pages: stay levels, add-ons, a child price and the estimate saved with
-- each enquiry. Run after 06_route_map.sql. Safe to re-run.
-- The example options below are placeholders. Every trip keeps the panel hidden (show_customiser = false)
-- until the owner checks the prices and ticks "Show Make it yours" on that trip in the admin.
-- ==============================================================================

alter table public.packages add column if not exists child_price numeric(12, 0) check (child_price is null or child_price >= 0);
alter table public.packages add column if not exists stay_levels jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists addons jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists show_customiser boolean not null default false;
alter table public.packages drop constraint if exists packages_options_check;
alter table public.packages add constraint packages_options_check check (
  jsonb_typeof(stay_levels) = 'array' and jsonb_typeof(addons) = 'array'
  and jsonb_array_length(stay_levels) <= 8 and jsonb_array_length(addons) <= 20
);

-- what the traveller picked and the estimate the website showed (recalculated on the server, never trusted from the browser)
alter table public.inquiries add column if not exists trip_slug text check (trip_slug is null or trip_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
alter table public.inquiries add column if not exists selection jsonb;
alter table public.inquiries add column if not exists estimate numeric(12, 0) check (estimate is null or estimate >= 0);

update public.packages
set child_price = coalesce(child_price, 12500),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":2500,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":6000,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Extra night in Darjeeling","price":3500,"per":"person","child_price":2000},{"name":"Tiger Hill sunrise drive","price":1200,"per":"group"},{"name":"Toy train joy ride","price":1600,"per":"person","child_price":1600}]$seed$::jsonb else addons end
where slug = 'sandakphu-vintage-land-rover';
update public.packages
set child_price = coalesce(child_price, 11000),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":2000,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":4500,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Porter for the whole trek","price":6000,"per":"group"},{"name":"Extra night in Darjeeling","price":3500,"per":"person","child_price":2000}]$seed$::jsonb else addons end
where slug = 'singalila-ridge-trek';
update public.packages
set child_price = coalesce(child_price, 15000),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":4000,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":9000,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Private car for the whole trip","price":7000,"per":"group"},{"name":"Extra night on the tea estate","price":5500,"per":"person","child_price":3000}]$seed$::jsonb else addons end
where slug = 'darjeeling-colonial-tea-retreat';
update public.packages
set child_price = coalesce(child_price, 10000),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":2000,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":4500,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Private car for the whole trip","price":6500,"per":"group"}]$seed$::jsonb else addons end
where slug = 'offbeat-silk-route-zuluk';
update public.packages
set child_price = coalesce(child_price, 14000),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":3000,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":7000,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Private car for the whole trip","price":9000,"per":"group"},{"name":"Extra night in Gangtok","price":3000,"per":"person","child_price":1800}]$seed$::jsonb else addons end
where slug = 'north-sikkim-gurudongmar-yumthang';
update public.packages
set child_price = coalesce(child_price, 11000),
    stay_levels = case when stay_levels = '[]'::jsonb then $seed$[{"name":"Standard","price":0,"note":"Homestays and family-run hotels, as listed in the day plan."},{"name":"Comfort","price":2500,"note":"Better rooms where the route allows, with attached bathrooms."},{"name":"Premium","price":6000,"note":"The best stay at each stop, including heritage hotels in Darjeeling or Gangtok."}]$seed$::jsonb else stay_levels end,
    addons = case when addons = '[]'::jsonb then $seed$[{"name":"Extra jeep safari","price":3500,"per":"group"},{"name":"Extra night in the forest","price":3000,"per":"person","child_price":1800}]$seed$::jsonb else addons end
where slug = 'dooars-wildlife-rhino-safari';
