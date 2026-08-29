alter table public.beans
  add column if not exists roaster_name text not null default '',
  add column if not exists origin text not null default '',
  add column if not exists process_method text not null default '',
  add column if not exists default_roast_level text not null default '',
  add column if not exists roasted_at text not null default '',
  add column if not exists purchased_at text not null default '',
  add column if not exists purchase_place text not null default '',
  add column if not exists purchase_url text not null default '',
  add column if not exists package_weight_gram numeric(10, 2) not null default 0,
  add column if not exists purchase_price numeric(12, 2) not null default 0;

alter table public.beans
  add constraint beans_purchase_url_http_check
  check (purchase_url = '' or purchase_url ~* '^https?://');

alter table public.beans
  add constraint beans_package_weight_nonnegative_check
  check (package_weight_gram >= 0);

alter table public.beans
  add constraint beans_purchase_price_nonnegative_check
  check (purchase_price >= 0);
