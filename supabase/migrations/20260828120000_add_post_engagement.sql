create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments(post_id, created_at asc)
  where status = 'visible';

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists post_likes_select_own on public.post_likes;
create policy post_likes_select_own
  on public.post_likes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
  on public.post_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts
      where posts.id = post_likes.post_id
        and posts.status = 'published'
        and posts.published_at is not null
    )
  );

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists post_comments_select_own on public.post_comments;
create policy post_comments_select_own
  on public.post_comments for select
  to authenticated
  using (user_id = auth.uid());

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

drop policy if exists post_comments_update_own on public.post_comments;
create policy post_comments_update_own
  on public.post_comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists post_comments_delete_own on public.post_comments;
create policy post_comments_delete_own
  on public.post_comments for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.get_posts_engagement(p_post_ids uuid[])
returns table (
  post_id uuid,
  like_count bigint,
  comment_count bigint,
  viewer_has_liked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    (select count(*) from public.post_likes l where l.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id and c.status = 'visible'),
    exists (
      select 1 from public.post_likes l
      where l.post_id = p.id and l.user_id = auth.uid()
    )
  from public.posts p
  where p.id = any(coalesce(p_post_ids, '{}'::uuid[]))
    and p.status = 'published'
    and p.published_at is not null;
$$;

create or replace function public.list_post_comments(p_post_id uuid)
returns table (
  comment_id uuid,
  content text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  display_name text,
  avatar_path text,
  is_author boolean,
  can_hide boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.content,
    c.status,
    c.created_at,
    c.updated_at,
    coalesce(pr.username, ''),
    coalesce(pr.display_name, 'Coffee Explorer'),
    pr.avatar_path,
    c.user_id = auth.uid(),
    p.user_id = auth.uid() and c.user_id <> auth.uid() and c.status = 'visible'
  from public.post_comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles pr on pr.user_id = c.user_id
  where c.post_id = p_post_id
    and p.status = 'published'
    and p.published_at is not null
    and (c.status = 'visible' or (p.user_id = auth.uid() and c.status = 'hidden'))
  order by c.created_at asc;
$$;

create or replace function public.set_post_like(p_post_id uuid, p_liked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.posts
    where id = p_post_id and status = 'published' and published_at is not null
  ) then
    raise exception 'Published post not found';
  end if;

  if p_liked then
    insert into public.post_likes(post_id, user_id)
    values (p_post_id, auth.uid())
    on conflict do nothing;
  else
    delete from public.post_likes
    where post_id = p_post_id and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.create_post_comment(p_post_id uuid, p_content text)
returns public.post_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.post_comments;
  normalized text := trim(coalesce(p_content, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.posts
    where id = p_post_id and status = 'published' and published_at is not null
  ) then raise exception 'Published post not found'; end if;
  if char_length(normalized) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters';
  end if;

  insert into public.post_comments(post_id, user_id, content)
  values (p_post_id, auth.uid(), normalized)
  returning * into inserted;
  return inserted;
end;
$$;

create or replace function public.update_post_comment(p_comment_id uuid, p_content text)
returns public.post_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.post_comments;
  normalized text := trim(coalesce(p_content, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(normalized) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters';
  end if;
  update public.post_comments
  set content = normalized, updated_at = now()
  where id = p_comment_id and user_id = auth.uid() and status = 'visible'
  returning * into updated;
  if updated.id is null then raise exception 'Comment not found'; end if;
  return updated;
end;
$$;

create or replace function public.delete_post_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.post_comments
  set status = 'deleted', updated_at = now()
  where id = p_comment_id and user_id = auth.uid() and status <> 'deleted';
end;
$$;

create or replace function public.hide_post_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.post_comments c
  set status = 'hidden', updated_at = now()
  where c.id = p_comment_id
    and c.status = 'visible'
    and exists (
      select 1 from public.posts p
      where p.id = c.post_id and p.user_id = auth.uid()
    );
end;
$$;

revoke all on function public.get_posts_engagement(uuid[]) from public;
revoke all on function public.list_post_comments(uuid) from public;
revoke all on function public.set_post_like(uuid, boolean) from public;
revoke all on function public.create_post_comment(uuid, text) from public;
revoke all on function public.update_post_comment(uuid, text) from public;
revoke all on function public.delete_post_comment(uuid) from public;
revoke all on function public.hide_post_comment(uuid) from public;

grant execute on function public.get_posts_engagement(uuid[]) to anon, authenticated;
grant execute on function public.list_post_comments(uuid) to anon, authenticated;
grant execute on function public.set_post_like(uuid, boolean) to authenticated;
grant execute on function public.create_post_comment(uuid, text) to authenticated;
grant execute on function public.update_post_comment(uuid, text) to authenticated;
grant execute on function public.delete_post_comment(uuid) to authenticated;
grant execute on function public.hide_post_comment(uuid) to authenticated;
