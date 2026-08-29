const DISCOVER_POST_COLUMNS = `
  id,
  user_id,
  content,
  published_at,
  published_blend_snapshots!inner (
    id,
    blend_name,
    source_version_number,
    version_name,
    snapshot,
    image_path
  )
`;

const PUBLIC_PROFILE_COLUMNS = "user_id,username,display_name,avatar_path";

export function createSupabaseDiscoverTimelineRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function listDiscoverPosts({ cursor = null, pageSize = 20 } = {}) {
    const supabase = await getClient();
    const normalizedPageSize = Math.min(20, Math.max(1, Number(pageSize) || 20));
    let query = supabase
      .from("posts")
      .select(DISCOVER_POST_COLUMNS)
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false });

    if (cursor?.publishedAt && cursor?.postId) {
      query = query.or(buildDiscoverCursorFilter(cursor));
    }

    const { data, error } = await query.limit(normalizedPageSize + 1);
    if (error) throw error;

    const pageRows = (data || []).slice(0, normalizedPageSize);
    const profilesByUserId = await loadPublicProfiles(
      supabase,
      [...new Set(pageRows.map((row) => row.user_id).filter(Boolean))],
    );
    const hasMore = (data || []).length > normalizedPageSize;
    const lastRow = pageRows.at(-1);

    return {
      posts: pageRows.map((row) => mapDiscoverPostRow(row, profilesByUserId.get(row.user_id))),
      hasMore,
      nextCursor: hasMore && lastRow
        ? { publishedAt: lastRow.published_at, postId: lastRow.id }
        : null,
    };
  }

  async function getDiscoverPost(postId) {
    const normalizedPostId = String(postId || "").trim();
    if (!isUuid(normalizedPostId)) return null;

    const supabase = await getClient();
    const { data, error } = await supabase
      .from("posts")
      .select(DISCOVER_POST_COLUMNS)
      .eq("id", normalizedPostId)
      .eq("status", "published")
      .not("published_at", "is", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const profilesByUserId = await loadPublicProfiles(
      supabase,
      data.user_id ? [data.user_id] : [],
    );
    return mapDiscoverPostRow(data, profilesByUserId.get(data.user_id));
  }

  return { listDiscoverPosts, getDiscoverPost };
}

export function buildDiscoverCursorFilter({ publishedAt, postId }) {
  return `published_at.lt.${publishedAt},and(published_at.eq.${publishedAt},id.lt.${postId})`;
}

export function mapDiscoverPostRow(row, profileRow = null) {
  const snapshotRow = Array.isArray(row.published_blend_snapshots)
    ? row.published_blend_snapshots[0]
    : row.published_blend_snapshots;
  const snapshot = snapshotRow?.snapshot || {};

  return {
    postId: row.id,
    content: row.content || "",
    publishedAt: row.published_at,
    author: {
      username: profileRow?.username || "",
      displayName: profileRow?.display_name || "Coffee Explorer",
      avatarPath: profileRow?.avatar_path || null,
    },
    blend: {
      name: snapshot.blendName || snapshotRow?.blend_name || "名称未設定のブレンド",
      goal: snapshot.blendGoal || "",
      version: Number(snapshot.version ?? snapshotRow?.source_version_number) || 1,
      versionName: snapshot.versionName || snapshotRow?.version_name || "",
      beans: mapPublicSnapshotBeans(snapshot.beans),
      brew: mapPublicSnapshotBrew(snapshot.brew),
    },
  };
}

async function loadPublicProfiles(supabase, userIds) {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .in("user_id", userIds);

  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.user_id, profile]));
}

function mapPublicSnapshotBeans(beans) {
  if (!Array.isArray(beans)) return [];
  return beans.map((bean) => {
    const snapshot = bean?.beanSnapshot || {};
    const details = {
      roasterName: snapshot.roasterName || "",
      origin: snapshot.origin || "",
      processMethod: snapshot.processMethod || "",
      purchasePlace: snapshot.purchasePlace || "",
      purchaseUrl: isHttpUrl(snapshot.purchaseUrl) ? snapshot.purchaseUrl : "",
    };
    const hasDetails = Object.values(details).some(Boolean);
    return {
      name: snapshot.name || "名称未設定の豆",
      ratio: Number(bean?.ratio) || 0,
      roastLevel: bean?.roastLevel || "",
      ...(hasDetails ? { details } : {}),
    };
  });
}

function mapPublicSnapshotBrew(brew) {
  if (!brew || typeof brew !== "object" || Array.isArray(brew)) return null;

  const methodSnapshot = brew.brewMethodSnapshot;
  const method = methodSnapshot && typeof methodSnapshot === "object" && !Array.isArray(methodSnapshot)
    ? {
        name: methodSnapshot.name || "",
        extractionType: methodSnapshot.extractionType || "",
        equipmentName: methodSnapshot.equipmentName || "",
        bloomPercent: optionalNumber(methodSnapshot.bloomPercent),
        bloomSeconds: optionalNumber(methodSnapshot.bloomSeconds),
        pour1Percent: optionalNumber(methodSnapshot.pour1Percent),
        pour2Percent: optionalNumber(methodSnapshot.pour2Percent),
        pour3Percent: optionalNumber(methodSnapshot.pour3Percent),
      }
    : null;

  const mapped = {
    doseGram: optionalNumber(brew.doseGram),
    brewRatio: optionalNumber(brew.brewRatio),
    targetBrewGram: optionalNumber(brew.targetBrewGram),
    grindSize: brew.grindSize || "",
    temperatureC: optionalNumber(brew.temperatureC),
    totalBrewSeconds: optionalNumber(brew.totalBrewSeconds),
    method: method && Object.values(method).some((value) => value !== "" && value !== null)
      ? method
      : null,
  };

  return Object.values(mapped).some((value) => value !== "" && value !== null) ? mapped : null;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
