alter table public.brew_methods
add column extraction_type text not null default '',
add column equipment_name text not null default '',
add constraint brew_methods_extraction_type_check
  check (extraction_type in ('', 'pour_over', 'immersion', 'pressure', 'vacuum', 'other')),
add constraint brew_methods_equipment_name_length_check
  check (char_length(equipment_name) <= 100);

alter table public.recipe_versions
add column grind_size text not null default '',
add column brew_temperature_c numeric,
add constraint recipe_versions_grind_size_check
  check (grind_size in ('', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse')),
add constraint recipe_versions_brew_temperature_c_check
  check (brew_temperature_c is null or brew_temperature_c between 0 and 100);

create or replace function public.save_recipe_version(payload jsonb)
returns table (
  saved_series_id uuid,
  saved_version_id uuid,
  saved_version_number integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested_series_id uuid;
  v_series_id uuid;
  v_series_name text;
  v_goal text;
  v_recipe_name text;
  v_change_note text;
  v_tasting_note text;
  v_dose_gram numeric;
  v_brew_ratio numeric;
  v_target_brew_gram numeric;
  v_blend_cost numeric;
  v_grind_size text;
  v_brew_temperature_c numeric;
  v_brew_method_id uuid;
  v_brew_method_snapshot jsonb;
  v_sensory jsonb;
  v_saved_at timestamptz;
  v_version_number integer;
  v_version_id uuid;
  v_beans jsonb;
  v_bean_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be an object';
  end if;

  v_recipe_name := btrim(coalesce(payload->>'name', ''));
  if v_recipe_name = '' then
    raise exception 'name is required';
  end if;

  v_beans := payload->'beans';
  if v_beans is null or jsonb_typeof(v_beans) <> 'array' then
    raise exception 'beans must be an array';
  end if;

  select count(*) into v_bean_count from jsonb_array_elements(v_beans);
  if v_bean_count = 0 then
    raise exception 'beans must not be empty';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_beans) as bean(value)
    where jsonb_typeof(bean.value) <> 'object'
      or not (bean.value ? 'ratio')
      or bean.value->>'ratio' is null
      or (bean.value->>'ratio')::numeric < 0
  ) then
    raise exception 'each bean must have a nonnegative ratio';
  end if;

  if payload ? 'seriesId' and nullif(payload->>'seriesId', '') is not null then
    if not ((payload->>'seriesId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
      raise exception 'seriesId must be a uuid';
    end if;
    v_requested_series_id := (payload->>'seriesId')::uuid;
  end if;

  if payload ? 'brewMethodId' and nullif(payload->>'brewMethodId', '') is not null then
    if not ((payload->>'brewMethodId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
      raise exception 'brewMethodId must be a uuid';
    end if;
    v_brew_method_id := (payload->>'brewMethodId')::uuid;

    if not exists (
      select 1 from public.brew_methods
      where id = v_brew_method_id and user_id = v_user_id
    ) then
      raise exception 'brewMethodId was not found';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_beans) as bean(value)
    where bean.value ? 'beanId'
      and nullif(bean.value->>'beanId', '') is not null
      and not ((bean.value->>'beanId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ) then
    raise exception 'beanId must be a uuid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_beans) as bean(value)
    where bean.value ? 'beanId'
      and nullif(bean.value->>'beanId', '') is not null
      and not exists (
        select 1 from public.beans
        where id = (bean.value->>'beanId')::uuid and user_id = v_user_id
      )
  ) then
    raise exception 'beanId was not found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_beans) as bean(value)
    where bean.value ? 'beanSnapshot'
      and jsonb_typeof(bean.value->'beanSnapshot') not in ('object', 'null')
  ) then
    raise exception 'beanSnapshot must be an object or null';
  end if;

  v_change_note := coalesce(payload->>'changeNote', '');
  v_tasting_note := coalesce(payload->>'tastingNote', payload->>'memo', '');
  v_dose_gram := case when payload ? 'doseGram' then (payload->>'doseGram')::numeric else 15 end;
  v_brew_ratio := case when payload ? 'brewRatio' then (payload->>'brewRatio')::numeric else 15 end;
  v_target_brew_gram := case when payload ? 'targetBrewGram' then (payload->>'targetBrewGram')::numeric else 225 end;
  v_blend_cost := case when payload ? 'blendCost' then (payload->>'blendCost')::numeric else 0 end;
  v_grind_size := coalesce(payload->>'grindSize', '');
  v_brew_temperature_c := case
    when payload ? 'brewTemperatureC' and nullif(payload->>'brewTemperatureC', '') is not null
      then (payload->>'brewTemperatureC')::numeric
    else null
  end;
  v_brew_method_snapshot := case
    when not (payload ? 'brewMethodSnapshot') or jsonb_typeof(payload->'brewMethodSnapshot') = 'null' then null
    else payload->'brewMethodSnapshot'
  end;
  v_sensory := case
    when not (payload ? 'sensory') or jsonb_typeof(payload->'sensory') = 'null' then '{}'::jsonb
    else payload->'sensory'
  end;
  v_saved_at := case
    when payload ? 'savedAt' and nullif(payload->>'savedAt', '') is not null then (payload->>'savedAt')::timestamptz
    else now()
  end;

  if v_dose_gram < 0 or v_brew_ratio < 0 or v_target_brew_gram < 0 or v_blend_cost < 0 then
    raise exception 'numeric recipe values must be nonnegative';
  end if;

  if v_grind_size not in ('', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse') then
    raise exception 'grindSize is invalid';
  end if;

  if v_brew_temperature_c is not null and (v_brew_temperature_c < 0 or v_brew_temperature_c > 100) then
    raise exception 'brewTemperatureC must be between 0 and 100';
  end if;

  if v_sensory is null or jsonb_typeof(v_sensory) <> 'object' then
    raise exception 'sensory must be an object';
  end if;

  if v_brew_method_snapshot is not null and jsonb_typeof(v_brew_method_snapshot) <> 'object' then
    raise exception 'brewMethodSnapshot must be an object or null';
  end if;

  if v_requested_series_id is null then
    v_series_name := btrim(coalesce(payload->>'seriesName', ''));
    v_goal := coalesce(payload->>'goal', '');
    if v_series_name = '' then
      raise exception 'seriesName is required';
    end if;

    insert into public.recipe_series (user_id, name, goal, status)
    values (v_user_id, v_series_name, v_goal, 'active')
    returning id into v_series_id;
    v_version_number := 1;
  else
    select series.id into v_series_id
    from public.recipe_series as series
    where series.id = v_requested_series_id and series.user_id = v_user_id
    for update;

    if not found then
      raise exception 'seriesId was not found';
    end if;

    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.recipe_versions
    where series_id = v_series_id and user_id = v_user_id;

    update public.recipe_series
    set
      name = coalesce(nullif(btrim(payload->>'seriesName'), ''), name),
      goal = coalesce(payload->>'goal', goal),
      status = 'active'
    where id = v_series_id and user_id = v_user_id;
  end if;

  insert into public.recipe_versions (
    user_id,
    series_id,
    version_number,
    name,
    change_note,
    tasting_note,
    dose_gram,
    brew_ratio,
    target_brew_gram,
    blend_cost,
    grind_size,
    brew_temperature_c,
    brew_method_id,
    brew_method_snapshot,
    sensory,
    saved_at
  )
  values (
    v_user_id,
    v_series_id,
    v_version_number,
    v_recipe_name,
    v_change_note,
    v_tasting_note,
    v_dose_gram,
    v_brew_ratio,
    v_target_brew_gram,
    v_blend_cost,
    v_grind_size,
    v_brew_temperature_c,
    v_brew_method_id,
    v_brew_method_snapshot,
    v_sensory,
    v_saved_at
  )
  returning id into v_version_id;

  insert into public.recipe_version_beans (
    user_id,
    recipe_version_id,
    bean_id,
    ratio,
    roast_level,
    bean_snapshot,
    position
  )
  select
    v_user_id,
    v_version_id,
    case when nullif(bean.value->>'beanId', '') is null then null else (bean.value->>'beanId')::uuid end,
    (bean.value->>'ratio')::numeric,
    coalesce(bean.value->>'roastLevel', ''),
    case
      when not (bean.value ? 'beanSnapshot') or jsonb_typeof(bean.value->'beanSnapshot') = 'null' then '{}'::jsonb
      else bean.value->'beanSnapshot'
    end,
    bean.ordinality - 1
  from jsonb_array_elements(v_beans) with ordinality as bean(value, ordinality);

  saved_series_id := v_series_id;
  saved_version_id := v_version_id;
  saved_version_number := v_version_number;
  return next;
end;
$$;

revoke execute on function public.save_recipe_version(jsonb) from public;
revoke execute on function public.save_recipe_version(jsonb) from anon;
grant execute on function public.save_recipe_version(jsonb) to authenticated;

create or replace function public.sanitize_published_blend_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_source_brew jsonb := new.snapshot->'brew';
  v_source_method jsonb := new.snapshot#>'{brew,brewMethodSnapshot}';
  v_public_beans jsonb;
  v_public_method jsonb;
  v_grind_size text;
  v_brew_temperature_c numeric;
begin
  select versions.grind_size, versions.brew_temperature_c
  into v_grind_size, v_brew_temperature_c
  from public.recipe_versions as versions
  where versions.id = new.source_version_id
    and versions.user_id = new.owner_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'ratio', bean.value->'ratio',
          'roastLevel', bean.value->'roastLevel',
          'beanSnapshot', jsonb_strip_nulls(
            jsonb_build_object('name', coalesce(bean.value#>'{beanSnapshot,name}', bean.value->'name'))
          )
        )
      ) order by bean.ordinality
    ),
    '[]'::jsonb
  )
  into v_public_beans
  from jsonb_array_elements(
    case when jsonb_typeof(new.snapshot->'beans') = 'array' then new.snapshot->'beans' else '[]'::jsonb end
  ) with ordinality as bean(value, ordinality);

  if jsonb_typeof(v_source_method) = 'object' then
    v_public_method := jsonb_strip_nulls(
      jsonb_build_object(
        'name', v_source_method->'name',
        'extractionType', v_source_method->'extractionType',
        'equipmentName', v_source_method->'equipmentName',
        'bloomPercent', v_source_method->'bloomPercent',
        'bloomSeconds', v_source_method->'bloomSeconds',
        'pour1Percent', v_source_method->'pour1Percent',
        'pour2Percent', v_source_method->'pour2Percent',
        'pour3Percent', v_source_method->'pour3Percent'
      )
    );
    if v_public_method = '{}'::jsonb then v_public_method := null; end if;
  end if;

  new.snapshot := jsonb_strip_nulls(
    jsonb_build_object(
      'blendName', new.snapshot->'blendName',
      'blendGoal', new.snapshot->'blendGoal',
      'version', new.snapshot->'version',
      'versionName', new.snapshot->'versionName',
      'changeNote', new.snapshot->'changeNote',
      'beans', v_public_beans,
      'brew', jsonb_strip_nulls(
        jsonb_build_object(
          'doseGram', v_source_brew->'doseGram',
          'brewRatio', v_source_brew->'brewRatio',
          'targetBrewGram', v_source_brew->'targetBrewGram',
          'grindSize', to_jsonb(nullif(v_grind_size, '')),
          'temperatureC', to_jsonb(v_brew_temperature_c),
          'totalBrewSeconds', v_source_brew->'totalBrewSeconds',
          'brewMethodSnapshot', v_public_method
        )
      ),
      'savedAt', new.snapshot->'savedAt'
    )
  );
  return new;
end;
$$;

update public.published_blend_snapshots
set snapshot = snapshot;
