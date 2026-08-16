export function createSupabaseDiscoverRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function publishRecipeVersion({ versionId, content = "", status = "published" }) {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    const payload = {
      versionId,
      content,
      status,
    };
    const { data, error } = await supabase.rpc("publish_recipe_version", { payload });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Recipe version was not published");
    return mapPublishResultRow(row);
  }

  return {
    publishRecipeVersion,
  };
}

export function mapPublishResultRow(row) {
  return {
    postId: row.post_id,
    snapshotId: row.snapshot_id,
    status: row.post_status,
    publishedAt: row.post_published_at || null,
  };
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}
