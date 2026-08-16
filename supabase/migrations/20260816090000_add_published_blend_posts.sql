create table public.published_blend_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  source_series_id uuid,
  source_version_id uuid not null,
  source_version_number integer not null,
  blend_name text not null,
  version_name text not null default '',
  snapshot jsonb not null,
  image_path text,
  created_at timestamptz not null default now(),
  constraint published_blend_snapshots_source_version_number_positive check (source_version_number > 0),
  constraint published_blend_snapshots_snapshot_object_check check (jsonb_typeof(snapshot) = 'object')
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_id uuid not null references public.published_blend_snapshots (id),
  source_version_id uuid not null,
  content text not null default '',
  status text not null default 'published',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_source_version_unique unique (source_version_id),
  constraint posts_status_check check (status in ('published', 'private', 'deleted')),
  constraint posts_content_length_check check (char_length(content) <= 2000)
);

create index published_blend_snapshots_owner_created_at_idx
on public.published_blend_snapshots (owner_user_id, created_at desc);

create index published_blend_snapshots_source_version_id_idx
on public.published_blend_snapshots (source_version_id);

create index posts_status_published_at_idx
on public.posts (status, published_at desc, id desc);

create index posts_user_id_status_updated_at_idx
on public.posts (user_id, status, updated_at desc);

create index posts_snapshot_id_idx
on public.posts (snapshot_id);

create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

create or replace function public.prevent_post_identity_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id <> old.user_id
    or new.snapshot_id <> old.snapshot_id
    or new.source_version_id <> old.source_version_id then
    raise exception 'post identity fields cannot be updated';
  end if;

  return new;
end;
$$;

revoke execute
  on function public.prevent_post_identity_update()
  from public;

create trigger posts_prevent_identity_update
before update on public.posts
for each row
execute function public.prevent_post_identity_update();

alter table public.published_blend_snapshots enable row level security;
alter table public.posts enable row level security;

create policy published_blend_snapshots_select_visible
on public.published_blend_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.snapshot_id = published_blend_snapshots.id
      and (
        posts.status = 'published'
        or posts.user_id = (select auth.uid())
      )
  )
);

create policy published_blend_snapshots_insert_own
on public.published_blend_snapshots
for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy posts_select_visible
on public.posts
for select
to anon, authenticated
using (
  status = 'published'
  or user_id = (select auth.uid())
);

create policy posts_insert_own
on public.posts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy posts_update_own
on public.posts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.publish_recipe_version(payload jsonb)
returns table (
  post_id uuid,
  snapshot_id uuid,
  post_status text,
  post_published_at timestamptz
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
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be an object';
  end if;

  if not (payload ? 'versionId') or nullif(payload->>'versionId', '') is null then
    raise exception 'versionId is required';
  end if;

  if not ((payload->>'versionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception 'versionId must be a uuid';
  end if;

  v_source_version_id := (payload->>'versionId')::uuid;
  v_status := coalesce(nullif(payload->>'status', ''), 'published');
  v_content := coalesce(payload->>'content', '');

  if v_status not in ('published', 'private') then
    raise exception 'status must be published or private';
  end if;

  if char_length(v_content) > 2000 then
    raise exception 'content must be 2000 characters or fewer';
  end if;

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
  join public.recipe_series as series
    on series.id = versions.series_id
    and series.user_id = versions.user_id
  where versions.id = v_source_version_id
    and versions.user_id = v_user_id
  for update of versions;

  if not found then
    raise exception 'versionId was not found';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'beanId', bean_rows.bean_id,
      'ratio', bean_rows.ratio,
      'roastLevel', bean_rows.roast_level,
      'beanSnapshot', bean_rows.bean_snapshot,
      'position', bean_rows.position
    )
    order by bean_rows.position
  )
  into v_beans_snapshot
  from public.recipe_version_beans as bean_rows
  where bean_rows.recipe_version_id = v_source_version_id
    and bean_rows.user_id = v_user_id;

  if v_beans_snapshot is null or jsonb_array_length(v_beans_snapshot) = 0 then
    raise exception 'version must have at least one bean';
  end if;

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

  select
    posts.id,
    posts.snapshot_id,
    posts.published_at
  into
    v_existing_post_id,
    v_existing_snapshot_id,
    v_existing_published_at
  from public.posts
  where posts.source_version_id = v_source_version_id
    and posts.user_id = v_user_id
  for update;

  if v_existing_post_id is null then
    insert into public.published_blend_snapshots (
      owner_user_id,
      source_series_id,
      source_version_id,
      source_version_number,
      blend_name,
      version_name,
      snapshot
    )
    values (
      v_user_id,
      v_series_id,
      v_source_version_id,
      v_version_number,
      v_series_name,
      v_version_name,
      v_snapshot
    )
    returning id
    into v_existing_snapshot_id;

    insert into public.posts (
      user_id,
      snapshot_id,
      source_version_id,
      content,
      status,
      published_at
    )
    values (
      v_user_id,
      v_existing_snapshot_id,
      v_source_version_id,
      v_content,
      v_status,
      case when v_status = 'published' then now() else null end
    )
    returning id, published_at
    into v_existing_post_id, v_existing_published_at;
  else
    update public.posts
    set
      content = v_content,
      status = v_status,
      published_at = case
        when v_status = 'published' then coalesce(public.posts.published_at, now())
        else public.posts.published_at
      end
    where id = v_existing_post_id
      and user_id = v_user_id
    returning published_at
    into v_existing_published_at;
  end if;

  post_id := v_existing_post_id;
  snapshot_id := v_existing_snapshot_id;
  post_status := v_status;
  post_published_at := v_existing_published_at;
  return next;
end;
$$;

revoke execute
  on function public.publish_recipe_version(jsonb)
  from public;

revoke execute
  on function public.publish_recipe_version(jsonb)
  from anon;

grant execute
  on function public.publish_recipe_version(jsonb)
  to authenticated;
