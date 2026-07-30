alter table public.beans
add column if not exists system_key text;

alter table public.brew_methods
add column if not exists system_key text;

create unique index if not exists beans_user_id_system_key_unique_idx
on public.beans (user_id, system_key)
where system_key is not null;

create unique index if not exists brew_methods_user_id_system_key_unique_idx
on public.brew_methods (user_id, system_key)
where system_key is not null;

create or replace function public.initialize_user_defaults()
returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_beans_created integer := 0;
  v_brew_methods_created integer := 0;
  v_default_brew_method_id uuid;
  v_settings_existed boolean := false;
  v_settings_rows integer := 0;
begin
  if v_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  with inserted as (
    insert into public.beans (
      user_id,
      system_key,
      name,
      note,
      color,
      ratio,
      visible_in_recipes,
      cost_per_kg,
      acidity,
      sweetness,
      bitterness,
      body,
      aroma
    )
    values
      (
        v_user_id,
        'ethiopia',
        'エチオピア ナチュラル',
        'ベリー、花、明るい酸味',
        '#b85243',
        0,
        true,
        5800,
        86,
        78,
        32,
        48,
        92
      ),
      (
        v_user_id,
        'brazil',
        'ブラジル No.2 Natural',
        'ナッツ、チョコ、丸い甘み',
        '#c38b2d',
        0,
        true,
        3600,
        38,
        82,
        48,
        74,
        58
      ),
      (
        v_user_id,
        'guatemala',
        'グアテマラ ウォッシュト',
        'カカオ、柑橘、整った後味',
        '#12656b',
        0,
        true,
        4700,
        64,
        66,
        55,
        68,
        70
      ),
      (
        v_user_id,
        'sumatra',
        'スマトラ マンデリン',
        'ハーブ、重厚なボディ、余韻',
        '#54745a',
        0,
        true,
        4200,
        26,
        46,
        72,
        92,
        64
      )
    on conflict (user_id, system_key)
    where system_key is not null
    do nothing
    returning 1
  )
  select count(*) into v_beans_created
  from inserted;

  with inserted as (
    insert into public.brew_methods (
      user_id,
      system_key,
      name,
      note,
      bloom_percent,
      pour1_percent,
      pour2_percent,
      pour3_percent,
      bloom_seconds
    )
    values
      (
        v_user_id,
        'standard-4-pour',
        '標準 4投式',
        '蒸らし後に3回で注ぎ切る基本レシピ',
        12,
        28,
        30,
        30,
        30
      ),
      (
        v_user_id,
        'sweet-forward',
        '甘み重視',
        '前半を厚めにして甘みとボディを出す',
        15,
        35,
        25,
        25,
        40
      )
    on conflict (user_id, system_key)
    where system_key is not null
    do nothing
    returning 1
  )
  select count(*) into v_brew_methods_created
  from inserted;

  select id
  into v_default_brew_method_id
  from public.brew_methods
  where user_id = v_user_id
    and system_key = 'standard-4-pour';

  if v_default_brew_method_id is null then
    raise exception 'Default brew method was not found';
  end if;

  select exists (
    select 1
    from public.app_settings
    where user_id = v_user_id
  )
  into v_settings_existed;

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

  return jsonb_build_object(
    'initialized',
    true,
    'beans_created',
    v_beans_created,
    'brew_methods_created',
    v_brew_methods_created,
    'settings_created',
    (not v_settings_existed and v_settings_rows > 0),
    'settings_selected_brew_method_id_set',
    v_settings_rows > 0
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
