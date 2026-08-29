const BEAN_COLUMNS =
  "id, system_key, name, note, color, ratio, visible_in_recipes, cost_per_kg, acidity, sweetness, bitterness, body, aroma, roaster_name, origin, process_method, default_roast_level, roasted_at, purchased_at, purchase_place, purchase_url, package_weight_gram, purchase_price, created_at, updated_at";

const DEFAULT_SYSTEM_KEY_ORDER = ["ethiopia", "brazil", "guatemala", "sumatra"];

export function createSupabaseBeanRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getBeans() {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("beans")
      .select(BEAN_COLUMNS)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    return sortBeanRows(data || []).map(mapBeanRowToBean);
  }

  async function createBean(bean) {
    const supabase = await getClient();
    const userId = await getAuthenticatedUserId(supabase);
    const payload = mapBeanToInsertPayload(bean, userId);
    const { data, error } = await supabase.from("beans").insert(payload).select(BEAN_COLUMNS).single();

    if (error) throw error;
    if (!data) throw new Error("Bean was not created");
    return mapBeanRowToBean(data);
  }

  async function updateBean(bean) {
    const supabase = await getClient();
    const payload = mapBeanToUpdatePayload(bean);
    const { data, error } = await supabase.from("beans").update(payload).eq("id", bean.id).select(BEAN_COLUMNS).single();

    if (error) throw error;
    if (!data) throw new Error("Bean was not found");
    return mapBeanRowToBean(data);
  }

  async function deleteBean(beanId) {
    const supabase = await getClient();
    const { data, error } = await supabase.from("beans").delete().eq("id", beanId).select("id");

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error("Bean was not found");
    return { id: beanId };
  }

  return { getBeans, createBean, updateBean, deleteBean };
}

export function mapBeanRowToBean(row) {
  return {
    id: row.id,
    name: row.name || "",
    note: row.note || "",
    color: row.color || "#12656b",
    ratio: Number(row.ratio) || 0,
    visibleInRecipes: row.visible_in_recipes !== false,
    costPerKg: Number(row.cost_per_kg) || 0,
    roasterName: row.roaster_name || "",
    origin: row.origin || "",
    processMethod: row.process_method || "",
    defaultRoastLevel: row.default_roast_level || "",
    roastedAt: row.roasted_at || "",
    purchasedAt: row.purchased_at || "",
    purchasePlace: row.purchase_place || "",
    purchaseUrl: row.purchase_url || "",
    packageWeightGram: Number(row.package_weight_gram) || 0,
    purchasePrice: Number(row.purchase_price) || 0,
    profile: {
      acidity: Number(row.acidity) || 0,
      sweetness: Number(row.sweetness) || 0,
      bitterness: Number(row.bitterness) || 0,
      body: Number(row.body) || 0,
      aroma: Number(row.aroma) || 0,
    },
  };
}

export function mapBeanToInsertPayload(bean, userId) {
  return {
    ...mapBeanToUpdatePayload(bean),
    ...(isUuid(bean.id) ? { id: bean.id } : {}),
    user_id: userId,
    system_key: null,
  };
}

export function mapBeanToUpdatePayload(bean) {
  return {
    name: bean.name || "",
    note: bean.note || "",
    color: bean.color || "#12656b",
    ratio: Number(bean.ratio) || 0,
    visible_in_recipes: bean.visibleInRecipes !== false,
    cost_per_kg: Number(bean.costPerKg) || 0,
    roaster_name: bean.roasterName || "",
    origin: bean.origin || "",
    process_method: bean.processMethod || "",
    default_roast_level: bean.defaultRoastLevel || "",
    roasted_at: bean.roastedAt || "",
    purchased_at: bean.purchasedAt || "",
    purchase_place: bean.purchasePlace || "",
    purchase_url: bean.purchaseUrl || "",
    package_weight_gram: Math.max(0, Number(bean.packageWeightGram) || 0),
    purchase_price: Math.max(0, Number(bean.purchasePrice) || 0),
    acidity: Number(bean.profile?.acidity) || 0,
    sweetness: Number(bean.profile?.sweetness) || 0,
    bitterness: Number(bean.profile?.bitterness) || 0,
    body: Number(bean.profile?.body) || 0,
    aroma: Number(bean.profile?.aroma) || 0,
  };
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}

function sortBeanRows(rows) {
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
