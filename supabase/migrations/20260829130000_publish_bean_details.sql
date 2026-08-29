alter table public.published_blend_snapshots
  add column if not exists include_bean_details boolean not null default false;

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
            jsonb_build_object(
              'name', coalesce(bean.value#>'{beanSnapshot,name}', bean.value->'name'),
              'roasterName', case when new.include_bean_details then nullif(bean.value#>>'{beanSnapshot,roasterName}', '') end,
              'origin', case when new.include_bean_details then nullif(bean.value#>>'{beanSnapshot,origin}', '') end,
              'processMethod', case when new.include_bean_details then nullif(bean.value#>>'{beanSnapshot,processMethod}', '') end,
              'purchasePlace', case when new.include_bean_details then nullif(bean.value#>>'{beanSnapshot,purchasePlace}', '') end,
              'purchaseUrl', case
                when new.include_bean_details
                  and bean.value#>>'{beanSnapshot,purchaseUrl}' ~* '^https?://'
                  then bean.value#>>'{beanSnapshot,purchaseUrl}'
              end
            )
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

drop trigger if exists published_blend_snapshots_sanitize_snapshot
on public.published_blend_snapshots;

create trigger published_blend_snapshots_sanitize_snapshot
before insert or update of snapshot
on public.published_blend_snapshots
for each row
execute function public.sanitize_published_blend_snapshot();

drop function if exists public.publish_recipe_version(jsonb);

create function public.publish_recipe_version(payload jsonb)
returns table (
  post_id uuid,
  snapshot_id uuid,
  post_status text,
  post_published_at timestamptz,
  include_bean_details boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_version_id uuid;
  v_status text;
  v_content text;
  v_include_bean_details boolean;
  v_series_id uuid;
  v_series_name text;
  v_series_goal text;
  v_version_number integer;
  v_version_name text;
  v_change_note text;
  v_tasting_note text;
  v_dose_gram numeric;
  v_brew_ratio numeric;
  v_target_brew_gram numeric;
  v_blend_cost numeric;
  v_brew_method_id uuid;
  v_brew_method_snapshot jsonb;
  v_sensory jsonb;
  v_saved_at timestamptz;
  v_beans_snapshot jsonb;
  v_snapshot jsonb;
  v_existing_post_id uuid;
  v_existing_snapshot_id uuid;
  v_existing_published_at timestamptz;
  v_existing_include_bean_details boolean;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'payload must be an object'; end if;
  if not (payload ? 'versionId') or nullif(payload->>'versionId', '') is null then raise exception 'versionId is required'; end if;
  if not ((payload->>'versionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then raise exception 'versionId must be a uuid'; end if;

  v_source_version_id := (payload->>'versionId')::uuid;
  v_status := coalesce(nullif(payload->>'status', ''), 'published');
  v_content := coalesce(payload->>'content', '');
  v_include_bean_details := lower(coalesce(payload->>'includeBeanDetails', 'false')) = 'true';

  if v_status not in ('published', 'private') then raise exception 'status must be published or private'; end if;
  if char_length(v_content) > 2000 then raise exception 'content must be 2000 characters or fewer'; end if;

  select
    versions.series_id,
    series.name,
    series.goal,
    versions.version_number,
    versions.name,
    versions.change_note,
    versions.tasting_note,
    versions.dose_gram,
    versions.brew_ratio,
    versions.target_brew_gram,
    versions.blend_cost,
    versions.brew_method_id,
    versions.brew_method_snapshot,
    versions.sensory,
    versions.saved_at
  into
    v_series_id,
    v_series_name,
    v_series_goal,
    v_version_number,
    v_version_name,
    v_change_note,
    v_tasting_note,
    v_dose_gram,
    v_brew_ratio,
    v_target_brew_gram,
    v_blend_cost,
    v_brew_method_id,
    v_brew_method_snapshot,
    v_sensory,
    v_saved_at
  from public.recipe_versions as versions
  join public.recipe_series as series on series.id = versions.series_id and series.user_id = versions.user_id
  where versions.id = v_source_version_id and versions.user_id = v_user_id
  for update of versions;

  if not found then raise exception 'versionId was not found'; end if;

  select jsonb_agg(
    jsonb_build_object(
      'beanId', bean_rows.bean_id,
      'ratio', bean_rows.ratio,
      'roastLevel', bean_rows.roast_level,
      'beanSnapshot', bean_rows.bean_snapshot,
      'position', bean_rows.position
    ) order by bean_rows.position
  )
  into v_beans_snapshot
  from public.recipe_version_beans as bean_rows
  where bean_rows.recipe_version_id = v_source_version_id and bean_rows.user_id = v_user_id;

  if v_beans_snapshot is null or jsonb_array_length(v_beans_snapshot) = 0 then raise exception 'version must have at least one bean'; end if;

  v_snapshot := jsonb_build_object(
    'blendName', v_series_name,
    'blendGoal', v_series_goal,
    'version', v_version_number,
    'versionName', v_version_name,
    'changeNote', v_change_note,
    'tastingNote', v_tasting_note,
    'beans', v_beans_snapshot,
    'brew', jsonb_build_object(
      'doseGram', v_dose_gram,
      'brewRatio', v_brew_ratio,
      'targetBrewGram', v_target_brew_gram,
      'blendCost', v_blend_cost,
      'brewMethodId', v_brew_method_id,
      'brewMethodSnapshot', v_brew_method_snapshot
    ),
    'sensory', coalesce(v_sensory, '{}'::jsonb),
    'savedAt', v_saved_at
  );

  select posts.id, posts.snapshot_id, posts.published_at, snapshots.include_bean_details
  into v_existing_post_id, v_existing_snapshot_id, v_existing_published_at, v_existing_include_bean_details
  from public.posts
  join public.published_blend_snapshots as snapshots on snapshots.id = posts.snapshot_id
  where posts.source_version_id = v_source_version_id and posts.user_id = v_user_id
  for update of posts;

  if v_existing_post_id is null then
    insert into public.published_blend_snapshots (
      owner_user_id,
      source_series_id,
      source_version_id,
      source_version_number,
      blend_name,
      version_name,
      include_bean_details,
      snapshot
    )
    values (
      v_user_id,
      v_series_id,
      v_source_version_id,
      v_version_number,
      v_series_name,
      v_version_name,
      v_include_bean_details,
      v_snapshot
    )
    returning id into v_existing_snapshot_id;

    insert into public.posts (user_id, snapshot_id, source_version_id, content, status, published_at)
    values (
      v_user_id,
      v_existing_snapshot_id,
      v_source_version_id,
      v_content,
      v_status,
      case when v_status = 'published' then now() else null end
    )
    returning id, published_at into v_existing_post_id, v_existing_published_at;
    v_existing_include_bean_details := v_include_bean_details;
  else
    update public.posts
    set
      content = v_content,
      status = v_status,
      published_at = case when v_status = 'published' then coalesce(public.posts.published_at, now()) else public.posts.published_at end
    where id = v_existing_post_id and user_id = v_user_id
    returning published_at into v_existing_published_at;
  end if;

  post_id := v_existing_post_id;
  snapshot_id := v_existing_snapshot_id;
  post_status := v_status;
  post_published_at := v_existing_published_at;
  include_bean_details := coalesce(v_existing_include_bean_details, false);
  return next;
end;
$$;

revoke execute on function public.publish_recipe_version(jsonb) from public;
revoke execute on function public.publish_recipe_version(jsonb) from anon;
grant execute on function public.publish_recipe_version(jsonb) to authenticated;
