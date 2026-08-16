import { describe, expect, test, vi } from "vitest";
import { createSupabaseDiscoverRepository, mapPublishResultRow } from "./supabaseDiscoverRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const postId = "33333333-3333-4333-8333-333333333333";
const snapshotId = "44444444-4444-4444-8444-444444444444";

describe("supabaseDiscoverRepository", () => {
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

function createClient({ authUser = { id: userId }, rpcData = null, rpcError = null } = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: rpcData, error: rpcError })),
  };
}
