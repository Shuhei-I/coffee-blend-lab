alter table public.recipe_series
add column source_post_id uuid references public.posts (id) on delete set null,
add column source_label text not null default '';

create index recipe_series_source_post_id_idx
on public.recipe_series (source_post_id)
where source_post_id is not null;

create or replace function public.copy_published_blend(p_post_id uuid)
returns table (
  copied_series_id uuid,
  copied_version_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot jsonb;
  v_blend_name text;
  v_blend_goal text;
  v_beans jsonb;
  v_brew jsonb;
  v_method jsonb;
  v_series_id uuid;
  v_version_id uuid;
  v_bean record;
  v_bean_id uuid;
  v_bean_name text;
  v_bean_snapshot jsonb;
  v_grind_size text;
  v_temperature numeric;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_post_id is null then
    raise exception 'post id is required';
  end if;

  select snapshots.snapshot
  into v_snapshot
  from public.posts as source_post
  join public.published_blend_snapshots as snapshots
    on snapshots.id = source_post.snapshot_id
  where source_post.id = p_post_id
    and source_post.status = 'published'
    and source_post.published_at is not null;

  if not found then
    raise exception 'published post was not found';
  end if;

  v_blend_name := btrim(coalesce(v_snapshot->>'blendName', ''));
  if v_blend_name = '' then v_blend_name := '公開ブレンド'; end if;
  v_blend_goal := coalesce(v_snapshot->>'blendGoal', '');
  v_beans := v_snapshot->'beans';
  v_brew := case when jsonb_typeof(v_snapshot->'brew') = 'object' then v_snapshot->'brew' else '{}'::jsonb end;
  v_method := case
    when jsonb_typeof(v_brew->'brewMethodSnapshot') = 'object' then v_brew->'brewMethodSnapshot'
    else null
  end;

  if jsonb_typeof(v_beans) <> 'array' or jsonb_array_length(v_beans) = 0 then
    raise exception 'published blend must have at least one bean';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_beans) as bean(value)
    where jsonb_typeof(bean.value) <> 'object'
      or nullif(bean.value->>'ratio', '') is null
      or (bean.value->>'ratio')::numeric < 0
  ) then
    raise exception 'published blend contains an invalid bean';
  end if;

  v_grind_size := coalesce(v_brew->>'grindSize', '');
  if v_grind_size not in ('', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse') then
    v_grind_size := '';
  end if;

  v_temperature := case
    when nullif(v_brew->>'temperatureC', '') is null then 90
    else (v_brew->>'temperatureC')::numeric
  end;
  if v_temperature < 0 or v_temperature > 100 then v_temperature := 90; end if;

  insert into public.recipe_series (user_id, name, goal, status, source_post_id, source_label)
  values (v_user_id, v_blend_name || '（コピー）', v_blend_goal, 'active', p_post_id, v_blend_name)
  returning id into v_series_id;

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
    1,
    v_blend_name || '（コピー）',
    '公開ブレンドからコピー',
    '',
    coalesce(nullif(v_brew->>'doseGram', '')::numeric, 20),
    coalesce(nullif(v_brew->>'brewRatio', '')::numeric, 16),
    coalesce(nullif(v_brew->>'targetBrewGram', '')::numeric, 320),
    0,
    v_grind_size,
    v_temperature,
    null,
    case when v_method is null then null else v_method || jsonb_build_object('note', '') end,
    '{}'::jsonb,
    now()
  )
  returning id into v_version_id;

  for v_bean in
    select bean.value, bean.ordinality
    from jsonb_array_elements(v_beans) with ordinality as bean(value, ordinality)
    order by bean.ordinality
  loop
    v_bean_name := btrim(coalesce(v_bean.value#>>'{beanSnapshot,name}', ''));
    if v_bean_name = '' then v_bean_name := '名称未設定の豆'; end if;

    select beans.id
    into v_bean_id
    from public.beans
    where beans.user_id = v_user_id
      and lower(btrim(beans.name)) = lower(v_bean_name)
    order by beans.created_at, beans.id
    limit 1;

    if v_bean_id is null then
      insert into public.beans (
        user_id,
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
      values (
        v_user_id,
        v_bean_name,
        '',
        case (v_bean.ordinality - 1) % 5
          when 0 then '#12656b'
          when 1 then '#b85243'
          when 2 then '#54745a'
          when 3 then '#c38b2d'
          else '#6a5f99'
        end,
        0,
        true,
        0,
        50,
        50,
        50,
        50,
        50
      )
      returning id into v_bean_id;
    end if;

    v_bean_snapshot := jsonb_build_object(
      'name', v_bean_name,
      'note', '',
      'color', case (v_bean.ordinality - 1) % 5
        when 0 then '#12656b'
        when 1 then '#b85243'
        when 2 then '#54745a'
        when 3 then '#c38b2d'
        else '#6a5f99'
      end,
      'visibleInRecipes', true,
      'costPerKg', 0,
      'profile', jsonb_build_object(
        'acidity', 50,
        'sweetness', 50,
        'bitterness', 50,
        'body', 50,
        'aroma', 50
      )
    );

    insert into public.recipe_version_beans (
      user_id,
      recipe_version_id,
      bean_id,
      ratio,
      roast_level,
      bean_snapshot,
      position
    )
    values (
      v_user_id,
      v_version_id,
      v_bean_id,
      (v_bean.value->>'ratio')::numeric,
      coalesce(v_bean.value->>'roastLevel', ''),
      v_bean_snapshot,
      v_bean.ordinality - 1
    );

    v_bean_id := null;
  end loop;

  copied_series_id := v_series_id;
  copied_version_id := v_version_id;
  return next;
end;
$$;

revoke execute on function public.copy_published_blend(uuid) from public;
revoke execute on function public.copy_published_blend(uuid) from anon;
grant execute on function public.copy_published_blend(uuid) to authenticated;
