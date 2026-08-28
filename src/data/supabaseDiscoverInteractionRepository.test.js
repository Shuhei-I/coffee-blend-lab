import { describe, expect, test, vi } from "vitest";
import {
  createSupabaseDiscoverInteractionRepository,
  mapCommentRow,
  mapEngagementRow,
} from "./supabaseDiscoverInteractionRepository.js";

const postId = "33333333-3333-4333-8333-333333333333";

describe("supabaseDiscoverInteractionRepository", () => {
  test("maps engagement and comment rows into public UI data", () => {
    expect(mapEngagementRow({ like_count: "3", comment_count: "2", viewer_has_liked: true })).toEqual({
      likeCount: 3,
      commentCount: 2,
      likedByViewer: true,
    });
    expect(mapCommentRow({
      comment_id: "comment-1",
      content: "Good blend",
      created_at: "2026-08-28T00:00:00Z",
      username: "shuhey",
      display_name: "Shuhey",
      is_author: true,
      can_hide: false,
    })).toMatchObject({
      commentId: "comment-1",
      author: { username: "shuhey", displayName: "Shuhey" },
      isAuthor: true,
      canHide: false,
    });
  });

  test("uses RPCs for reads and mutations", async () => {
    const client = {
      rpc: vi.fn(async (name) => {
        if (name === "get_posts_engagement") {
          return { data: [{ post_id: postId, like_count: 1, comment_count: 0, viewer_has_liked: false }], error: null };
        }
        if (name === "list_post_comments") {
          return { data: [{ comment_id: "comment-1", content: "Hello" }], error: null };
        }
        return { data: null, error: null };
      }),
    };
    const repository = createSupabaseDiscoverInteractionRepository({ client });

    await expect(repository.getEngagement([postId])).resolves.toEqual(new Map([
      [postId, { likeCount: 1, commentCount: 0, likedByViewer: false }],
    ]));
    await expect(repository.listComments(postId)).resolves.toMatchObject([{ commentId: "comment-1" }]);
    await repository.setLike(postId, true);
    await repository.createComment(postId, "Hello");
    await repository.updateComment("comment-1", "Updated");
    await repository.deleteComment("comment-1");
    await repository.hideComment("comment-1");

    expect(client.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_posts_engagement",
      "list_post_comments",
      "set_post_like",
      "create_post_comment",
      "update_post_comment",
      "delete_post_comment",
      "hide_post_comment",
    ]);
    expect(client.rpc).toHaveBeenCalledWith("set_post_like", { p_post_id: postId, p_liked: true });
  });
});
