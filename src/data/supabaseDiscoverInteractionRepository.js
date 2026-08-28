export function createSupabaseDiscoverInteractionRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getEngagement(postIds = []) {
    const ids = [...new Set(postIds.filter(Boolean))];
    if (ids.length === 0) return new Map();

    const supabase = await getClient();
    const { data, error } = await supabase.rpc("get_posts_engagement", { p_post_ids: ids });
    if (error) throw error;
    return new Map((data || []).map((row) => [row.post_id, mapEngagementRow(row)]));
  }

  async function listComments(postId) {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("list_post_comments", { p_post_id: postId });
    if (error) throw error;
    return (data || []).map(mapCommentRow);
  }

  async function setLike(postId, liked) {
    const supabase = await getClient();
    const { error } = await supabase.rpc("set_post_like", { p_post_id: postId, p_liked: Boolean(liked) });
    if (error) throw error;
  }

  async function createComment(postId, content) {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("create_post_comment", {
      p_post_id: postId,
      p_content: content,
    });
    if (error) throw error;
    return mapCommentRow(Array.isArray(data) ? data[0] : data);
  }

  async function updateComment(commentId, content) {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("update_post_comment", {
      p_comment_id: commentId,
      p_content: content,
    });
    if (error) throw error;
    return mapCommentRow(Array.isArray(data) ? data[0] : data);
  }

  async function deleteComment(commentId) {
    const supabase = await getClient();
    const { error } = await supabase.rpc("delete_post_comment", { p_comment_id: commentId });
    if (error) throw error;
  }

  async function hideComment(commentId) {
    const supabase = await getClient();
    const { error } = await supabase.rpc("hide_post_comment", { p_comment_id: commentId });
    if (error) throw error;
  }

  return { getEngagement, listComments, setLike, createComment, updateComment, deleteComment, hideComment };
}

export function mapEngagementRow(row = {}) {
  return {
    likeCount: Number(row.like_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    likedByViewer: Boolean(row.viewer_has_liked),
  };
}

export function mapCommentRow(row = {}) {
  row = row || {};
  return {
    commentId: row.comment_id || row.id,
    content: row.content || "",
    status: row.status || "visible",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    author: {
      username: row.username || "",
      displayName: row.display_name || "Coffee Explorer",
      avatarPath: row.avatar_path || null,
    },
    isAuthor: Boolean(row.is_author),
    canHide: Boolean(row.can_hide),
  };
}
