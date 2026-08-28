drop policy if exists post_comments_insert_own on public.post_comments;
create policy post_comments_insert_own
  on public.post_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts
      where posts.id = post_comments.post_id
        and posts.status = 'published'
        and posts.published_at is not null
    )
  );
