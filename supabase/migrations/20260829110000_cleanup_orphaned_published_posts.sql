update public.posts as posts
set status = 'deleted'
where posts.status <> 'deleted'
  and not exists (
    select 1
    from public.recipe_versions as versions
    where versions.id = posts.source_version_id
  );
