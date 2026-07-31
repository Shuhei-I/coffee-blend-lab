create table public.beans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  note text not null default '',
  color text not null default '#12656b',
  ratio integer not null default 0,
  visible_in_recipes boolean not null default true,
  cost_per_kg numeric not null default 0,
  acidity integer not null default 50,
  sweetness integer not null default 50,
  bitterness integer not null default 50,
  body integer not null default 50,
  aroma integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beans_user_id_id_unique unique (id, user_id),
  constraint beans_ratio_nonnegative check (ratio >= 0),
  constraint beans_cost_per_kg_nonnegative check (cost_per_kg >= 0),
  constraint beans_acidity_range check (acidity between 0 and 100),
  constraint beans_sweetness_range check (sweetness between 0 and 100),
  constraint beans_bitterness_range check (bitterness between 0 and 100),
  constraint beans_body_range check (body between 0 and 100),
  constraint beans_aroma_range check (aroma between 0 and 100)
);

create table public.brew_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  note text not null default '',
  bloom_percent numeric not null default 20,
  pour1_percent numeric not null default 30,
  pour2_percent numeric not null default 30,
  pour3_percent numeric not null default 20,
  bloom_seconds integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brew_methods_user_id_id_unique unique (id, user_id),
  constraint brew_methods_bloom_seconds_nonnegative check (bloom_seconds >= 0)
);

create table public.recipe_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  goal text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_series_user_id_id_unique unique (id, user_id),
  constraint recipe_series_status_check check (status in ('active', 'archived'))
);

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id uuid not null,
  version_number integer not null,
  name text not null,
  change_note text not null default '',
  tasting_note text not null default '',
  dose_gram numeric not null default 15,
  brew_ratio numeric not null default 15,
  target_brew_gram numeric not null default 225,
  blend_cost numeric not null default 0,
  brew_method_id uuid,
  brew_method_snapshot jsonb,
  sensory jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_versions_user_id_id_unique unique (id, user_id),
  constraint recipe_versions_series_version_unique unique (user_id, series_id, version_number),
  constraint recipe_versions_series_owner_fk
    foreign key (series_id, user_id)
    references public.recipe_series (id, user_id)
    on delete cascade,
  constraint recipe_versions_brew_method_owner_fk
    foreign key (brew_method_id, user_id)
    references public.brew_methods (id, user_id)
    on delete set null (brew_method_id),
  constraint recipe_versions_version_number_positive check (version_number > 0),
  constraint recipe_versions_dose_gram_nonnegative check (dose_gram >= 0),
  constraint recipe_versions_brew_ratio_nonnegative check (brew_ratio >= 0),
  constraint recipe_versions_target_brew_gram_nonnegative check (target_brew_gram >= 0),
  constraint recipe_versions_blend_cost_nonnegative check (blend_cost >= 0)
);

create table public.recipe_version_beans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_version_id uuid not null,
  bean_id uuid,
  ratio numeric not null default 0,
  roast_level text not null default '',
  bean_snapshot jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_version_beans_user_id_id_unique unique (id, user_id),
  constraint recipe_version_beans_version_owner_fk
    foreign key (recipe_version_id, user_id)
    references public.recipe_versions (id, user_id)
    on delete cascade,
  constraint recipe_version_beans_bean_owner_fk
    foreign key (bean_id, user_id)
    references public.beans (id, user_id)
    on delete set null (bean_id),
  constraint recipe_version_beans_version_position_unique unique (user_id, recipe_version_id, position),
  constraint recipe_version_beans_ratio_nonnegative check (ratio >= 0),
  constraint recipe_version_beans_position_nonnegative check (position >= 0)
);

create table public.app_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_brew_method_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_selected_brew_method_owner_fk
    foreign key (selected_brew_method_id, user_id)
    references public.brew_methods (id, user_id)
    on delete set null (selected_brew_method_id)
);

create index beans_user_id_idx on public.beans (user_id);
create index brew_methods_user_id_idx on public.brew_methods (user_id);
create index recipe_series_user_id_status_updated_at_idx
  on public.recipe_series (user_id, status, updated_at desc);
create index recipe_versions_user_id_series_version_number_idx
  on public.recipe_versions (user_id, series_id, version_number desc);
create index recipe_versions_series_id_idx on public.recipe_versions (series_id);
create index recipe_versions_brew_method_id_idx
  on public.recipe_versions (brew_method_id)
  where brew_method_id is not null;
create index recipe_version_beans_user_id_recipe_version_position_idx
  on public.recipe_version_beans (user_id, recipe_version_id, position);
create index recipe_version_beans_recipe_version_id_idx
  on public.recipe_version_beans (recipe_version_id);
create index recipe_version_beans_bean_id_idx
  on public.recipe_version_beans (bean_id)
  where bean_id is not null;
create index app_settings_selected_brew_method_id_idx
  on public.app_settings (selected_brew_method_id)
  where selected_brew_method_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

create trigger beans_set_updated_at
before update on public.beans
for each row
execute function public.set_updated_at();

create trigger brew_methods_set_updated_at
before update on public.brew_methods
for each row
execute function public.set_updated_at();

create trigger recipe_series_set_updated_at
before update on public.recipe_series
for each row
execute function public.set_updated_at();

create trigger recipe_versions_set_updated_at
before update on public.recipe_versions
for each row
execute function public.set_updated_at();

create trigger recipe_version_beans_set_updated_at
before update on public.recipe_version_beans
for each row
execute function public.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

alter table public.beans enable row level security;
alter table public.brew_methods enable row level security;
alter table public.recipe_series enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_version_beans enable row level security;
alter table public.app_settings enable row level security;

create policy beans_select_own
on public.beans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy beans_insert_own
on public.beans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy beans_update_own
on public.beans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy beans_delete_own
on public.beans
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy brew_methods_select_own
on public.brew_methods
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy brew_methods_insert_own
on public.brew_methods
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy brew_methods_update_own
on public.brew_methods
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy brew_methods_delete_own
on public.brew_methods
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_series_select_own
on public.recipe_series
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_series_insert_own
on public.recipe_series
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy recipe_series_update_own
on public.recipe_series
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy recipe_series_delete_own
on public.recipe_series
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_versions_select_own
on public.recipe_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_versions_insert_own
on public.recipe_versions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy recipe_versions_update_own
on public.recipe_versions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy recipe_versions_delete_own
on public.recipe_versions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_version_beans_select_own
on public.recipe_version_beans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_version_beans_insert_own
on public.recipe_version_beans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy recipe_version_beans_update_own
on public.recipe_version_beans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy recipe_version_beans_delete_own
on public.recipe_version_beans
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy app_settings_select_own
on public.app_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy app_settings_insert_own
on public.app_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy app_settings_update_own
on public.app_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy app_settings_delete_own
on public.app_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);
