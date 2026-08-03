alter table public.recipe_versions
add constraint recipe_versions_dose_gram_positive
check (dose_gram > 0)
not valid;

alter table public.recipe_versions
add constraint recipe_versions_brew_ratio_positive
check (brew_ratio > 0)
not valid;

create or replace function public.enforce_recipe_version_bean_ratio_total()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recipe_version_id uuid := coalesce(new.recipe_version_id, old.recipe_version_id);
  v_version_exists boolean := false;
  v_positive_ratio_count integer := 0;
  v_ratio_total numeric := 0;
begin
  select exists (
    select 1
    from public.recipe_versions
    where id = v_recipe_version_id
  )
  into v_version_exists;

  if not v_version_exists then
    return null;
  end if;

  select
    count(*) filter (where ratio > 0),
    coalesce(sum(ratio), 0)
  into
    v_positive_ratio_count,
    v_ratio_total
  from public.recipe_version_beans
  where recipe_version_id = v_recipe_version_id;

  if v_positive_ratio_count = 0 then
    raise exception 'at least one bean ratio must be positive';
  end if;

  if v_ratio_total <> 100 then
    raise exception 'bean ratios must total 100';
  end if;

  return null;
end;
$$;

revoke execute
  on function public.enforce_recipe_version_bean_ratio_total()
  from public;

drop trigger if exists recipe_version_beans_enforce_ratio_total
on public.recipe_version_beans;

create constraint trigger recipe_version_beans_enforce_ratio_total
after insert or update or delete
on public.recipe_version_beans
deferrable initially deferred
for each row
execute function public.enforce_recipe_version_bean_ratio_total();
