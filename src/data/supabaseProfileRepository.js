const PROFILE_COLUMNS = "user_id, username, display_name, bio, avatar_path, created_at, updated_at";

export function createSupabaseProfileRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getOwnProfile() {
    const supabase = await getClient();
    const userId = await getAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  }

  async function saveOwnProfile(profile) {
    const supabase = await getClient();
    const userId = await getAuthenticatedUserId(supabase);
    const payload = mapProfileToPayload(profile, userId);
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Profile was not saved");
    return mapProfileRow(data);
  }

  return {
    getOwnProfile,
    saveOwnProfile,
  };
}

export function mapProfileRow(row) {
  return {
    userId: row.user_id,
    username: row.username || "",
    displayName: row.display_name || "",
    bio: row.bio || "",
    avatarPath: row.avatar_path || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileToPayload(profile, userId) {
  const normalizedUsername = normalizeUsername(profile?.username);
  const validation = validateProfileInput({
    username: normalizedUsername,
    displayName: profile?.displayName,
    bio: profile?.bio,
  });

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  return {
    user_id: userId,
    username: normalizedUsername,
    display_name: (profile?.displayName || "").trim(),
    bio: (profile?.bio || "").trim(),
    avatar_path: profile?.avatarPath || null,
  };
}

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

export function validateProfileInput({ username, displayName = "", bio = "" } = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    return {
      valid: false,
      reason: "ユーザー名は3〜20文字の半角英小文字・数字・アンダースコアで入力してください。",
    };
  }
  if (String(displayName || "").trim().length > 60) {
    return {
      valid: false,
      reason: "Display name must be 60 characters or fewer.",
    };
  }
  if (String(bio || "").trim().length > 160) {
    return {
      valid: false,
      reason: "Bio must be 160 characters or fewer.",
    };
  }
  return { valid: true, reason: "" };
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}
