const APP_SETTINGS_COLUMNS = "user_id, selected_brew_method_id, created_at, updated_at";

export function createSupabaseAppSettingsRepository({ client } = {}) {
  let clientPromise = client ? Promise.resolve(client) : null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import("../lib/supabaseClient.js").then((module) => module.supabase);
    }
    return clientPromise;
  }

  async function getAppSettings() {
    const supabase = await getClient();
    await getAuthenticatedUserId(supabase);
    const { data, error } = await supabase.from("app_settings").select(APP_SETTINGS_COLUMNS).maybeSingle();

    if (error) throw error;
    return mapAppSettingsRow(data);
  }

  async function saveSelectedBrewMethodId(selectedBrewMethodId) {
    const supabase = await getClient();
    const userId = await getAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("app_settings")
      .upsert(
        {
          user_id: userId,
          selected_brew_method_id: selectedBrewMethodId || null,
        },
        { onConflict: "user_id" },
      )
      .select(APP_SETTINGS_COLUMNS)
      .single();

    if (error) throw error;
    if (!data) throw new Error("App settings were not saved");
    return mapAppSettingsRow(data);
  }

  return {
    getAppSettings,
    saveSelectedBrewMethodId,
  };
}

export function mapAppSettingsRow(row) {
  return {
    selectedBrewMethodId: row?.selected_brew_method_id || null,
  };
}

async function getAuthenticatedUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) throw new Error("User must be authenticated");
  return userId;
}
