import { toRecipeSeries, toSavePayload } from "./recipeMapper.js";

const RECIPE_SERIES_COLUMNS = "id, name, goal, status, created_at, updated_at";
const RECIPE_VERSION_COLUMNS =
  "id, series_id, version_number, name, change_note, tasting_note, dose_gram, brew_ratio, target_brew_gram, blend_cost, brew_method_id, brew_method_snapshot, sensory, saved_at, created_at, updated_at";
const RECIPE_VERSION_BEAN_COLUMNS =
  "id, recipe_version_id, bean_id, ratio, roast_level, bean_snapshot, position, created_at, updated_at";

export function createSupabaseRecipeRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getRecipeSeries() {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    const rows = await loadRecipeRows(supabase);
    return toRecipeSeries(rows.seriesRows, rows.versionRows, rows.beanRows);
  }

  async function saveRecipeVersion(recipeInput) {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    const payload = toSavePayload(recipeInput);
    const { error } = await supabase.rpc("save_recipe_version", { payload });

    if (error) throw error;
    return getRecipeSeries();
  }

  async function archiveRecipeSeries(seriesId) {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    await updateRecipeSeriesStatus(supabase, seriesId, "archived");
    return getRecipeSeries();
  }

  async function restoreRecipeSeries(seriesId) {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    await updateRecipeSeriesStatus(supabase, seriesId, "active");
    return getRecipeSeries();
  }

  async function deleteRecipeVersion({ seriesId, versionId }) {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    const versions = await loadVersionIdsForSeries(supabase, seriesId);

    if (!versions.some((version) => version.id === versionId)) {
      throw new Error("Recipe version was not found");
    }
    if (versions.length <= 1) {
      throw new Error("Cannot delete the last recipe version");
    }

    const { data, error } = await supabase.from("recipe_versions").delete().eq("id", versionId).select("id");

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error("Recipe version was not found");
    return getRecipeSeries();
  }

  return {
    getRecipeSeries,
    saveRecipeVersion,
    archiveRecipeSeries,
    restoreRecipeSeries,
    deleteRecipeVersion,
  };
}

async function loadRecipeRows(supabase) {
  const { data: seriesRows, error: seriesError } = await supabase
    .from("recipe_series")
    .select(RECIPE_SERIES_COLUMNS)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (seriesError) throw seriesError;
  if (!seriesRows?.length) {
    return { seriesRows: seriesRows || [], versionRows: [], beanRows: [] };
  }

  const { data: versionRows, error: versionError } = await supabase
    .from("recipe_versions")
    .select(RECIPE_VERSION_COLUMNS)
    .order("version_number", { ascending: false })
    .order("saved_at", { ascending: false });

  if (versionError) throw versionError;

  const { data: beanRows, error: beanError } = await supabase
    .from("recipe_version_beans")
    .select(RECIPE_VERSION_BEAN_COLUMNS)
    .order("position", { ascending: true });

  if (beanError) throw beanError;

  return {
    seriesRows: seriesRows || [],
    versionRows: versionRows || [],
    beanRows: beanRows || [],
  };
}

async function updateRecipeSeriesStatus(supabase, seriesId, status) {
  const { data, error } = await supabase
    .from("recipe_series")
    .update({ status })
    .eq("id", seriesId)
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Recipe series was not found");
}

async function loadVersionIdsForSeries(supabase, seriesId) {
  const { data, error } = await supabase.from("recipe_versions").select("id").eq("series_id", seriesId);

  if (error) throw error;
  return data || [];
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}
