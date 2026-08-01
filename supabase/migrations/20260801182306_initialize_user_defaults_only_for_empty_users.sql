alter function public.initialize_user_defaults()
rename to initialize_user_defaults_seed_missing_defaults;

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
    return public.initialize_user_defaults_seed_missing_defaults();
  end if;

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

  return jsonb_build_object(
    'initialized',
    true,
    'beans_created',
    0,
    'brew_methods_created',
    0,
    'settings_created',
    (not v_settings_existed and v_settings_rows > 0),
    'settings_selected_brew_method_id_set',
    v_settings_rows > 0
  );
end;
$$;

revoke execute
  on function public.initialize_user_defaults_seed_missing_defaults()
  from public;

revoke execute
  on function public.initialize_user_defaults_seed_missing_defaults()
  from anon;

revoke execute
  on function public.initialize_user_defaults_seed_missing_defaults()
  from authenticated;

revoke execute
  on function public.initialize_user_defaults()
  from public;

revoke execute
  on function public.initialize_user_defaults()
  from anon;

grant execute
  on function public.initialize_user_defaults()
  to authenticated;
