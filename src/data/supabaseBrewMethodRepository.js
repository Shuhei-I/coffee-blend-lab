const BREW_METHOD_COLUMNS =
  "id, system_key, name, note, bloom_percent, pour1_percent, pour2_percent, pour3_percent, bloom_seconds, created_at, updated_at";

const DEFAULT_SYSTEM_KEY_ORDER = ["standard-4-pour", "sweet-forward"];

export function createSupabaseBrewMethodRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getBrewMethods() {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("brew_methods")
      .select(BREW_METHOD_COLUMNS)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    return sortBrewMethodRows(data || []).map(mapBrewMethodRowToBrewMethod);
  }

  async function createBrewMethod(brewMethod) {
    const supabase = await getClient();
    const userId = await getAuthenticatedUserId(supabase);
    const payload = mapBrewMethodToInsertPayload(brewMethod, userId);
    const { data, error } = await supabase.from("brew_methods").insert(payload).select(BREW_METHOD_COLUMNS).single();

    if (error) throw error;
    if (!data) throw new Error("Brew method was not created");
    return mapBrewMethodRowToBrewMethod(data);
  }

  async function updateBrewMethod(brewMethod) {
    const supabase = await getClient();
    const payload = mapBrewMethodToUpdatePayload(brewMethod);
    const { data, error } = await supabase
      .from("brew_methods")
      .update(payload)
      .eq("id", brewMethod.id)
      .select(BREW_METHOD_COLUMNS)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Brew method was not found");
    return mapBrewMethodRowToBrewMethod(data);
  }

  async function deleteBrewMethod(brewMethodId) {
    const supabase = await getClient();
    const { data, error } = await supabase.from("brew_methods").delete().eq("id", brewMethodId).select("id");

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error("Brew method was not found");
    return { id: brewMethodId };
  }

  return { getBrewMethods, createBrewMethod, updateBrewMethod, deleteBrewMethod };
}

export function mapBrewMethodRowToBrewMethod(row) {
  const brewMethod = {
    id: row.id,
    name: row.name || "",
    note: row.note || "",
    bloomPercent: Number(row.bloom_percent) || 0,
    pour1Percent: Number(row.pour1_percent) || 0,
    pour2Percent: Number(row.pour2_percent) || 0,
    pour3Percent: Number(row.pour3_percent) || 0,
    bloomSeconds: Number(row.bloom_seconds) || 0,
  };

  if (row.system_key) {
    Object.defineProperty(brewMethod, "systemKey", {
      value: row.system_key,
      enumerable: false,
    });
  }

  return brewMethod;
}

export function mapBrewMethodToInsertPayload(brewMethod, userId) {
  return {
    ...mapBrewMethodToUpdatePayload(brewMethod),
    ...(isUuid(brewMethod.id) ? { id: brewMethod.id } : {}),
    user_id: userId,
    system_key: null,
  };
}

export function mapBrewMethodToUpdatePayload(brewMethod) {
  return {
    name: brewMethod.name || "",
    note: brewMethod.note || "",
    bloom_percent: Number(brewMethod.bloomPercent) || 0,
    pour1_percent: Number(brewMethod.pour1Percent) || 0,
    pour2_percent: Number(brewMethod.pour2Percent) || 0,
    pour3_percent: Number(brewMethod.pour3Percent) || 0,
    bloom_seconds: Number(brewMethod.bloomSeconds) || 0,
  };
}

export function resolveSelectedBrewMethodId({ brewMethods, selectedBrewMethodId }) {
  if (brewMethods.some((method) => method.id === selectedBrewMethodId)) {
    return selectedBrewMethodId;
  }

  const systemKeyMatch = brewMethods.find((method) => method.systemKey === selectedBrewMethodId);
  return systemKeyMatch?.id || brewMethods[0]?.id || selectedBrewMethodId;
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}

function sortBrewMethodRows(rows) {
  return [...rows].sort((a, b) => {
    const aDefault = DEFAULT_SYSTEM_KEY_ORDER.indexOf(a.system_key);
    const bDefault = DEFAULT_SYSTEM_KEY_ORDER.indexOf(b.system_key);
    if (aDefault !== -1 || bDefault !== -1) {
      if (aDefault === -1) return 1;
      if (bDefault === -1) return -1;
      return aDefault - bDefault;
    }
    return String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.id).localeCompare(String(b.id));
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}
