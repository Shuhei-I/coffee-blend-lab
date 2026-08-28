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
begin
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'ratio', bean.value->'ratio',
          'roastLevel', bean.value->'roastLevel',
          'beanSnapshot', jsonb_strip_nulls(
            jsonb_build_object(
              'name', coalesce(bean.value#>'{beanSnapshot,name}', bean.value->'name')
            )
          )
        )
      )
      order by bean.ordinality
    ),
    '[]'::jsonb
  )
  into v_public_beans
  from jsonb_array_elements(
    case
      when jsonb_typeof(new.snapshot->'beans') = 'array' then new.snapshot->'beans'
      else '[]'::jsonb
    end
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

    if v_public_method = '{}'::jsonb then
      v_public_method := null;
    end if;
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
          'grindSize', v_source_brew->'grindSize',
          'temperatureC', v_source_brew->'temperatureC',
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

revoke execute
  on function public.sanitize_published_blend_snapshot()
  from public;

drop trigger if exists published_blend_snapshots_sanitize_snapshot
on public.published_blend_snapshots;

create trigger published_blend_snapshots_sanitize_snapshot
before insert or update of snapshot
on public.published_blend_snapshots
for each row
execute function public.sanitize_published_blend_snapshot();

update public.published_blend_snapshots
set snapshot = snapshot;
