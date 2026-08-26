drop policy if exists published_blend_snapshots_select_visible
on public.published_blend_snapshots;

create policy published_blend_snapshots_select_visible
on public.published_blend_snapshots
for select
to anon, authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.posts
    where posts.snapshot_id = published_blend_snapshots.id
      and posts.status = 'published'
  )
);
