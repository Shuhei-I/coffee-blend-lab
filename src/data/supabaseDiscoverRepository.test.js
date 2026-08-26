import { describe, expect, test, vi } from "vitest";
import {
  createSupabaseDiscoverRepository,
  mapPostRow,
  mapPublishResultRow,
} from "./supabaseDiscoverRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const postId = "33333333-3333-4333-8333-333333333333";
const snapshotId = "44444444-4444-4444-8444-444444444444";

describe("supabaseDiscoverRepository", () => {
  test("maps owned post rows to app shape", () => {
    expect(
      mapPostRow({
        id: postId,
        snapshot_id: snapshotId,
        source_version_id: versionId,
        content: "Summer blend",
        status: "private",
        published_at: null,
      }),
    ).toEqual({
      postId,
      snapshotId,
      versionId,
      content: "Summer blend",
      status: "private",
      publishedAt: null,
    });
  });

  test("maps publish RPC rows to app shape", () => {
    expect(
      mapPublishResultRow({
        post_id: postId,
        snapshot_id: snapshotId,
        post_status: "published",
        post_published_at: "2026-08-16T00:00:00Z",
      }),
    ).toEqual({
      postId,
      snapshotId,
      status: "published",
      publishedAt: "2026-08-16T00:00:00Z",
    });
  });

  test("publishes a recipe version through the authenticated RPC", async () => {
    const client = createClient({
      rpcData: [
        {
          post_id: postId,
          snapshot_id: snapshotId,
          post_status: "published",
          post_published_at: "2026-08-16T00:00:00Z",
        },
      ],
    });
    const repository = createSupabaseDiscoverRepository({ client });

    await expect(
      repository.publishRecipeVersion({
        versionId,
        content: "Summer blend",
        status: "published",
      }),
    ).resolves.toEqual({
      postId,
      snapshotId,
      status: "published",
      publishedAt: "2026-08-16T00:00:00Z",
    });
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith("publish_recipe_version", {
      payload: {
        versionId,
        content: "Summer blend",
        status: "published",
      },
    });
  });

  test("uses safe publish defaults", async () => {
    const client = createClient({
      rpcData: {
        post_id: postId,
        snapshot_id: snapshotId,
        post_status: "published",
        post_published_at: "2026-08-16T00:00:00Z",
      },
    });
    const repository = createSupabaseDiscoverRepository({ client });

    await expect(repository.publishRecipeVersion({ versionId })).resolves.toEqual({
      postId,
      snapshotId,
      status: "published",
      publishedAt: "2026-08-16T00:00:00Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("publish_recipe_version", {
      payload: {
        versionId,
        content: "",
        status: "published",
      },
    });
  });

  test("loads only the authenticated user's posts for recipe versions", async () => {
    const queryData = [
      {
        id: postId,
        snapshot_id: snapshotId,
        source_version_id: versionId,
        content: "Summer blend",
        status: "published",
        published_at: "2026-08-16T00:00:00Z",
      },
    ];
    const client = createClient({ queryData });
    const repository = createSupabaseDiscoverRepository({ client });

    await expect(repository.getOwnPostsForVersions([versionId, versionId])).resolves.toEqual([
      {
        postId,
        snapshotId,
        versionId,
        content: "Summer blend",
        status: "published",
        publishedAt: "2026-08-16T00:00:00Z",
      },
    ]);
    expect(client.from).toHaveBeenCalledWith("posts");
    expect(client.query.select).toHaveBeenCalledWith("id,snapshot_id,source_version_id,content,status,published_at");
    expect(client.query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(client.query.in).toHaveBeenCalledWith("source_version_id", [versionId]);
  });

  test("skips the database query when there are no recipe versions", async () => {
    const client = createClient();
    const repository = createSupabaseDiscoverRepository({ client });

    await expect(repository.getOwnPostsForVersions([])).resolves.toEqual([]);
    expect(client.auth.getUser).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  test("throws auth, RPC, and empty response errors", async () => {
    await expect(
      createSupabaseDiscoverRepository({ client: createClient({ authUser: null }) }).publishRecipeVersion({ versionId }),
    ).rejects.toThrow("User must be authenticated");

    await expect(
      createSupabaseDiscoverRepository({ client: createClient({ rpcError: new Error("rpc failed") }) }).publishRecipeVersion({
        versionId,
      }),
    ).rejects.toThrow("rpc failed");

    await expect(
      createSupabaseDiscoverRepository({ client: createClient({ rpcData: [] }) }).publishRecipeVersion({ versionId }),
    ).rejects.toThrow("Recipe version was not published");
  });
});

function createClient({
  authUser = { id: userId },
  rpcData = null,
  rpcError = null,
  queryData = [],
  queryError = null,
} = {}) {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(async () => ({ data: queryData, error: queryError }));
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: rpcData, error: rpcError })),
    from: vi.fn(() => query),
    query,
  };
  return client;
}
