import { describe, expect, test, vi } from "vitest";
import {
  buildDiscoverCursorFilter,
  createSupabaseDiscoverTimelineRepository,
  mapDiscoverPostRow,
} from "./supabaseDiscoverTimelineRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const postId = "33333333-3333-4333-8333-333333333333";
const snapshotId = "44444444-4444-4444-8444-444444444444";

describe("supabaseDiscoverTimelineRepository", () => {
  test("maps public timeline rows without exposing internal recipe IDs", () => {
    expect(
      mapDiscoverPostRow(
        discoverPostRow(),
        { username: "shuhey", display_name: "Shuhey", avatar_path: null },
      ),
    ).toEqual({
      postId,
      content: "夏向けに軽く調整しました",
      publishedAt: "2026-08-26T03:00:00Z",
      author: {
        username: "shuhey",
        displayName: "Shuhey",
        avatarPath: null,
      },
      blend: {
        name: "Summer Blend",
        goal: "軽い後味",
        version: 3,
        versionName: "v3",
        beans: [
          { name: "Brazil", ratio: 50, roastLevel: "medium" },
          { name: "Ethiopia", ratio: 50, roastLevel: "light" },
        ],
        brew: {
          doseGram: 15,
          brewRatio: 16,
          targetBrewGram: 240,
          grindSize: "medium_fine",
          temperatureC: 92,
          totalBrewSeconds: null,
          method: {
            name: "V60 4投式",
            extractionType: "pour_over",
            equipmentName: "V60",
            bloomPercent: 12,
            bloomSeconds: 30,
            pour1Percent: 28,
            pour2Percent: 30,
            pour3Percent: 30,
          },
        },
      },
    });

    expect(JSON.stringify(mapDiscoverPostRow(discoverPostRow()))).not.toContain("internal-");
  });

  test("builds a stable published-at and post-id cursor filter", () => {
    expect(
      buildDiscoverCursorFilter({ publishedAt: "2026-08-26T03:00:00Z", postId }),
    ).toBe(
      `published_at.lt.2026-08-26T03:00:00Z,and(published_at.eq.2026-08-26T03:00:00Z,id.lt.${postId})`,
    );
  });

  test("maps explicitly published bean details without exposing private fields", () => {
    const row = discoverPostRow();
    row.published_blend_snapshots.snapshot.beans[0].beanSnapshot = {
      id: "internal-brazil",
      name: "Brazil",
      roasterName: "Example Roastery",
      origin: "Minas Gerais",
      processMethod: "Natural",
      purchasePlace: "Roastery online shop",
      purchaseUrl: "https://example.com/brazil",
      purchasePrice: 2400,
      purchasedAt: "2026-08-01",
    };

    expect(mapDiscoverPostRow(row).blend.beans[0]).toEqual({
      name: "Brazil",
      ratio: 50,
      roastLevel: "medium",
      details: {
        roasterName: "Example Roastery",
        origin: "Minas Gerais",
        processMethod: "Natural",
        purchasePlace: "Roastery online shop",
        purchaseUrl: "https://example.com/brazil",
      },
    });
    expect(JSON.stringify(mapDiscoverPostRow(row).blend.beans[0])).not.toContain("purchasePrice");
    expect(JSON.stringify(mapDiscoverPostRow(row).blend.beans[0])).not.toContain("purchasedAt");
  });

  test("loads the newest 20 public posts and returns a cursor when more exist", async () => {
    const timelineData = Array.from({ length: 21 }, (_, index) => discoverPostRow({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      published_at: `2026-08-${String(26 - index).padStart(2, "0")}T03:00:00Z`,
    }));
    const client = createClient({
      timelineData,
      profileData: [{ user_id: userId, username: "shuhey", display_name: "Shuhey", avatar_path: null }],
    });
    const repository = createSupabaseDiscoverTimelineRepository({ client });

    const result = await repository.listDiscoverPosts();

    expect(result.posts).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toEqual({
      publishedAt: timelineData[19].published_at,
      postId: timelineData[19].id,
    });
    expect(client.query.eq).toHaveBeenCalledWith("status", "published");
    expect(client.query.not).toHaveBeenCalledWith("published_at", "is", null);
    expect(client.query.order).toHaveBeenNthCalledWith(1, "published_at", { ascending: false });
    expect(client.query.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(client.query.limit).toHaveBeenCalledWith(21);
    expect(client.profileQuery.in).toHaveBeenCalledWith("user_id", [userId]);
  });

  test("applies the next-page cursor and clamps page size", async () => {
    const client = createClient({ timelineData: [discoverPostRow()] });
    const repository = createSupabaseDiscoverTimelineRepository({ client });
    const cursor = { publishedAt: "2026-08-26T03:00:00Z", postId };

    const result = await repository.listDiscoverPosts({ cursor, pageSize: 100 });

    expect(client.query.or).toHaveBeenCalledWith(buildDiscoverCursorFilter(cursor));
    expect(client.query.limit).toHaveBeenCalledWith(21);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  test("loads one published post by id", async () => {
    const client = createClient({
      detailData: discoverPostRow(),
      profileData: [{ user_id: userId, username: "shuhey", display_name: "Shuhey", avatar_path: null }],
    });
    const repository = createSupabaseDiscoverTimelineRepository({ client });

    await expect(repository.getDiscoverPost(postId)).resolves.toMatchObject({
      postId,
      author: { username: "shuhey" },
      blend: { name: "Summer Blend", version: 3 },
    });
    expect(client.query.eq).toHaveBeenNthCalledWith(1, "id", postId);
    expect(client.query.eq).toHaveBeenNthCalledWith(2, "status", "published");
    expect(client.query.not).toHaveBeenCalledWith("published_at", "is", null);
    expect(client.query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  test("returns not found without querying for an invalid post id", async () => {
    const client = createClient();
    const repository = createSupabaseDiscoverTimelineRepository({ client });

    await expect(repository.getDiscoverPost("not-a-post-id")).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });
});

function createClient({
  timelineData = [],
  timelineError = null,
  detailData = null,
  detailError = null,
  profileData = [],
  profileError = null,
} = {}) {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.not = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.limit = vi.fn(async () => ({ data: timelineData, error: timelineError }));
  query.maybeSingle = vi.fn(async () => ({ data: detailData, error: detailError }));

  const profileQuery = {};
  profileQuery.select = vi.fn(() => profileQuery);
  profileQuery.in = vi.fn(async () => ({ data: profileData, error: profileError }));

  return {
    from: vi.fn((table) => (table === "profiles" ? profileQuery : query)),
    query,
    profileQuery,
  };
}

function discoverPostRow(patch = {}) {
  return {
    id: postId,
    user_id: userId,
    content: "夏向けに軽く調整しました",
    published_at: "2026-08-26T03:00:00Z",
    published_blend_snapshots: {
      id: snapshotId,
      blend_name: "Summer Blend",
      source_version_number: 3,
      version_name: "v3",
      image_path: null,
      snapshot: {
        blendName: "Summer Blend",
        blendGoal: "軽い後味",
        version: 3,
        versionName: "v3",
        beans: [
          { beanId: "internal-brazil", ratio: 50, roastLevel: "medium", beanSnapshot: { id: "internal-brazil", name: "Brazil" } },
          { beanId: "internal-ethiopia", ratio: 50, roastLevel: "light", beanSnapshot: { id: "internal-ethiopia", name: "Ethiopia" } },
        ],
        brew: {
          doseGram: 15,
          brewRatio: 16,
          targetBrewGram: 240,
          grindSize: "medium_fine",
          temperatureC: 92,
          brewMethodId: "internal-method",
          brewMethodSnapshot: {
            id: "internal-method",
            name: "V60 4投式",
            note: "private note",
            extractionType: "pour_over",
            equipmentName: "V60",
            bloomPercent: 12,
            bloomSeconds: 30,
            pour1Percent: 28,
            pour2Percent: 30,
            pour3Percent: 30,
          },
        },
      },
    },
    ...patch,
  };
}
