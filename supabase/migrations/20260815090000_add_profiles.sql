create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length_check check (char_length(display_name) <= 60),
  constraint profiles_bio_length_check check (char_length(bio) <= 160)
);

create unique index profiles_username_unique_idx
on public.profiles (username);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_public
on public.profiles
for select
to anon, authenticated
using (true);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.initialize_user_defaults()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_bean_count integer := 0;
  v_brew_method_count integer := 0;
  v_settings_existed boolean := false;
  v_settings_rows integer := 0;
  v_default_brew_method_id uuid;
  v_profile_existed boolean := false;
  v_profile_rows integer := 0;
  v_seed_result jsonb := '{}'::jsonb;
begin
  if v_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  select count(*)
  into v_bean_count
  from public.beans
  where user_id = v_user_id;

  select count(*)
  into v_brew_method_count
  from public.brew_methods
  where user_id = v_user_id;

  if v_bean_count = 0 and v_brew_method_count = 0 then
    v_seed_result := public.initialize_user_defaults_seed_missing_defaults();
  else
    select exists (
      select 1
      from public.app_settings
      where user_id = v_user_id
    )
    into v_settings_existed;

    select id
    into v_default_brew_method_id
    from public.brew_methods
    where user_id = v_user_id
    order by
      case when system_key = 'standard-4-pour' then 0 else 1 end,
      created_at,
      id
    limit 1;

    if v_default_brew_method_id is not null then
      insert into public.app_settings (
        user_id,
        selected_brew_method_id
      )
      values (
        v_user_id,
        v_default_brew_method_id
      )
      on conflict (user_id)
      do update
        set selected_brew_method_id = excluded.selected_brew_method_id
        where public.app_settings.selected_brew_method_id is null;

      get diagnostics v_settings_rows = row_count;
    end if;
  end if;

  select exists (
    select 1
    from public.profiles
    where user_id = v_user_id
  )
  into v_profile_existed;

  insert into public.profiles (
    user_id,
    username,
    display_name,
    bio
  )
  values (
    v_user_id,
    'user_' || left(replace(v_user_id::text, '-', ''), 12),
    'Coffee Explorer',
    ''
  )
  on conflict (user_id)
  do nothing;

  get diagnostics v_profile_rows = row_count;

  return jsonb_build_object(
    'initialized',
    true,
    'beans_created',
    coalesce((v_seed_result->>'beans_created')::integer, 0),
    'brew_methods_created',
    coalesce((v_seed_result->>'brew_methods_created')::integer, 0),
    'settings_created',
    coalesce((v_seed_result->>'settings_created')::boolean, (not v_settings_existed and v_settings_rows > 0)),
    'settings_selected_brew_method_id_set',
    coalesce((v_seed_result->>'settings_selected_brew_method_id_set')::boolean, v_settings_rows > 0),
    'profile_created',
    (not v_profile_existed and v_profile_rows > 0)
  );
end;
$$;

revoke execute
  on function public.initialize_user_defaults()
  from public;

revoke execute
  on function public.initialize_user_defaults()
  from anon;

grant execute
  on function public.initialize_user_defaults()
  to authenticated;
