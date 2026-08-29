alter table public.recipe_versions
add column deleted_at timestamptz;

create index recipe_versions_active_series_version_idx
on public.recipe_versions (user_id, series_id, version_number desc)
where deleted_at is null;

create or replace function public.delete_recipe_version(p_series_id uuid, p_version_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_active_version_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select count(*)
  into v_active_version_count
  from public.recipe_versions
  where user_id = v_user_id
    and series_id = p_series_id
    and deleted_at is null;

  if v_active_version_count <= 1 then
    raise exception 'cannot delete the last recipe version';
  end if;

  update public.recipe_versions
  set deleted_at = now()
  where id = p_version_id
    and series_id = p_series_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'recipe version was not found';
  end if;

  update public.posts
  set status = 'deleted'
  where user_id = v_user_id
    and source_version_id = p_version_id
    and status <> 'deleted';
end;
$$;

revoke execute on function public.delete_recipe_version(uuid, uuid) from public;
revoke execute on function public.delete_recipe_version(uuid, uuid) from anon;
grant execute on function public.delete_recipe_version(uuid, uuid) to authenticated;
