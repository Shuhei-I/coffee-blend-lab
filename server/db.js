import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export let db;

export function getDefaultDbPath() {
  return process.env.COFFEE_MANAGER_DB_PATH || join(process.cwd(), "data", "coffee-manager.sqlite");
}

export function configureDb(dbPath = getDefaultDbPath()) {
  closeDb();
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  initializeDb();
  return db;
}

export function closeDb() {
  if (!db) return;
  db.close();
  db = undefined;
}

export const defaultBeans = [
  {
    id: "ethiopia",
    name: "エチオピア ナチュラル",
    note: "ベリー、花、明るい酸味",
    color: "#b85243",
    ratio: 0,
    costPerKg: 5800,
    profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
  },
  {
    id: "brazil",
    name: "ブラジル パルプドナチュラル",
    note: "ナッツ、チョコ、丸い甘み",
    color: "#c38b2d",
    ratio: 0,
    costPerKg: 3600,
    profile: { acidity: 38, sweetness: 82, bitterness: 48, body: 74, aroma: 58 },
  },
  {
    id: "guatemala",
    name: "グアテマラ ウォッシュト",
    note: "カカオ、柑橘、整った後味",
    color: "#12656b",
    ratio: 0,
    costPerKg: 4700,
    profile: { acidity: 64, sweetness: 66, bitterness: 55, body: 68, aroma: 70 },
  },
  {
    id: "sumatra",
    name: "スマトラ マンデリン",
    note: "ハーブ、重厚なボディ、余韻",
    color: "#54745a",
    ratio: 0,
    costPerKg: 4200,
    profile: { acidity: 26, sweetness: 46, bitterness: 72, body: 92, aroma: 64 },
  },
];

export const defaultBrewMethods = [
  {
    id: "standard-4-pour",
    name: "標準 4投式",
    note: "蒸らし後に3回で注ぎ切る基本レシピ",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
  },
  {
    id: "sweet-forward",
    name: "甘み重視",
    note: "前半を厚めにして甘みとボディを出す",
    bloomPercent: 15,
    pour1Percent: 35,
    pour2Percent: 25,
    pour3Percent: 25,
    bloomSeconds: 40,
  },
];

function initializeDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS beans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#12656b',
      ratio INTEGER NOT NULL DEFAULT 0,
      visible_in_recipes INTEGER NOT NULL DEFAULT 1,
      cost_per_kg REAL NOT NULL DEFAULT 0,
      acidity INTEGER NOT NULL DEFAULT 50,
      sweetness INTEGER NOT NULL DEFAULT 50,
      bitterness INTEGER NOT NULL DEFAULT 50,
      body INTEGER NOT NULL DEFAULT 50,
      aroma INTEGER NOT NULL DEFAULT 50,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brew_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      bloom_percent INTEGER NOT NULL DEFAULT 0,
      pour1_percent INTEGER NOT NULL DEFAULT 0,
      pour2_percent INTEGER NOT NULL DEFAULT 0,
      pour3_percent INTEGER NOT NULL DEFAULT 0,
      bloom_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blend_recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dose_gram REAL NOT NULL DEFAULT 0,
      brew_ratio REAL NOT NULL DEFAULT 0,
      target_brew_gram REAL NOT NULL DEFAULT 0,
      blend_cost REAL NOT NULL DEFAULT 0,
      brew_method_id TEXT,
      brew_method_snapshot TEXT,
      sensory TEXT,
      memo TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blend_recipe_beans (
      recipe_id TEXT NOT NULL,
      bean_id TEXT NOT NULL,
      ratio REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (recipe_id, bean_id),
      FOREIGN KEY (recipe_id) REFERENCES blend_recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_series (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      goal TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      current_version_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipe_versions (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      tasting_note TEXT NOT NULL DEFAULT '',
      dose_gram REAL NOT NULL DEFAULT 0,
      brew_ratio REAL NOT NULL DEFAULT 0,
      target_brew_gram REAL NOT NULL DEFAULT 0,
      blend_cost REAL NOT NULL DEFAULT 0,
      brew_method_id TEXT,
      brew_method_snapshot TEXT,
      sensory TEXT,
      saved_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(series_id, version),
      FOREIGN KEY (series_id) REFERENCES recipe_series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_version_beans (
      version_id TEXT NOT NULL,
      bean_id TEXT NOT NULL,
      ratio REAL NOT NULL DEFAULT 0,
      roast_level TEXT NOT NULL DEFAULT '',
      bean_snapshot TEXT,
      PRIMARY KEY (version_id, bean_id),
      FOREIGN KEY (version_id) REFERENCES recipe_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  ensureBeanColumns();
  ensureBlendRecipeColumns();
  ensureRecipeVersionBeanColumns();
  migrateRecipesToSeries();
  seedDefaults();
}

configureDb();

function transaction(work) {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function seedDefaults() {
  const beanCount = db.prepare("SELECT COUNT(*) AS count FROM beans").get().count;
  if (beanCount === 0) {
    const insertBean = db.prepare(`
      INSERT INTO beans (id, name, note, color, ratio, cost_per_kg, acidity, sweetness, bitterness, body, aroma)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    transaction(() => {
      defaultBeans.forEach((bean) => {
        insertBean.run(
          bean.id,
          bean.name,
          bean.note,
          bean.color,
          bean.ratio,
          bean.costPerKg,
          bean.profile.acidity,
          bean.profile.sweetness,
          bean.profile.bitterness,
          bean.profile.body,
          bean.profile.aroma,
        );
      });
    });
  }

  const methodCount = db.prepare("SELECT COUNT(*) AS count FROM brew_methods").get().count;
  if (methodCount === 0) {
    const insertMethod = db.prepare(`
      INSERT INTO brew_methods (id, name, note, bloom_percent, pour1_percent, pour2_percent, pour3_percent, bloom_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    transaction(() => {
      defaultBrewMethods.forEach((method) => {
        insertMethod.run(
          method.id,
          method.name,
          method.note,
          method.bloomPercent,
          method.pour1Percent,
          method.pour2Percent,
          method.pour3Percent,
          method.bloomSeconds,
        );
      });
    });
  }

  const selected = db.prepare("SELECT value FROM app_settings WHERE key = ?").get("selectedBrewMethodId");
  if (!selected) {
    db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
      "selectedBrewMethodId",
      defaultBrewMethods[0].id,
    );
  }
}

function ensureBeanColumns() {
  const columns = new Set(db.prepare("PRAGMA table_info(beans)").all().map((column) => column.name));
  const requiredColumns = [
    ["visible_in_recipes", "INTEGER NOT NULL DEFAULT 1"],
  ];

  requiredColumns.forEach(([name, definition]) => {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE beans ADD COLUMN ${name} ${definition}`);
    }
  });
}

function ensureBlendRecipeColumns() {
  const columns = new Set(db.prepare("PRAGMA table_info(blend_recipes)").all().map((column) => column.name));
  const requiredColumns = [
    ["dose_gram", "REAL NOT NULL DEFAULT 0"],
    ["brew_ratio", "REAL NOT NULL DEFAULT 0"],
    ["target_brew_gram", "REAL NOT NULL DEFAULT 0"],
    ["blend_cost", "REAL NOT NULL DEFAULT 0"],
    ["brew_method_id", "TEXT"],
    ["brew_method_snapshot", "TEXT"],
    ["sensory", "TEXT"],
    ["memo", "TEXT NOT NULL DEFAULT ''"],
  ];

  requiredColumns.forEach(([name, definition]) => {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE blend_recipes ADD COLUMN ${name} ${definition}`);
    }
  });
}

function ensureRecipeVersionBeanColumns() {
  const columns = new Set(db.prepare("PRAGMA table_info(recipe_version_beans)").all().map((column) => column.name));
  const requiredColumns = [
    ["roast_level", "TEXT NOT NULL DEFAULT ''"],
  ];

  requiredColumns.forEach(([name, definition]) => {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE recipe_version_beans ADD COLUMN ${name} ${definition}`);
    }
  });
}

export function getState() {
  const recipeSeries = getRecipeSeries();
  return {
    beans: getBeans(),
    brewMethods: getBrewMethods(),
    selectedBrewMethodId: getSetting("selectedBrewMethodId", defaultBrewMethods[0].id),
    recipeSeries,
    recipes: recipeSeries.flatMap((series) => series.versions),
  };
}

export function getBeans() {
  return db
    .prepare("SELECT * FROM beans ORDER BY created_at ASC")
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      color: row.color,
      ratio: row.ratio,
      visibleInRecipes: row.visible_in_recipes !== 0,
      costPerKg: row.cost_per_kg,
      profile: {
        acidity: row.acidity,
        sweetness: row.sweetness,
        bitterness: row.bitterness,
        body: row.body,
        aroma: row.aroma,
      },
    }));
}

export function saveBeans(beans) {
  const replace = db.prepare(`
    INSERT INTO beans (id, name, note, color, ratio, visible_in_recipes, cost_per_kg, acidity, sweetness, bitterness, body, aroma, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      note = excluded.note,
      color = excluded.color,
      ratio = excluded.ratio,
      visible_in_recipes = excluded.visible_in_recipes,
      cost_per_kg = excluded.cost_per_kg,
      acidity = excluded.acidity,
      sweetness = excluded.sweetness,
      bitterness = excluded.bitterness,
      body = excluded.body,
      aroma = excluded.aroma,
      updated_at = CURRENT_TIMESTAMP
  `);
  transaction(() => {
    db.prepare("DELETE FROM beans WHERE id NOT IN (SELECT value FROM json_each(?))").run(
      JSON.stringify(beans.map((bean) => bean.id)),
    );
    beans.forEach((bean) => {
      replace.run(
        bean.id,
        bean.name,
        bean.note,
        bean.color,
        Number(bean.ratio) || 0,
        bean.visibleInRecipes === false ? 0 : 1,
        Number(bean.costPerKg) || 0,
        Number(bean.profile?.acidity) || 0,
        Number(bean.profile?.sweetness) || 0,
        Number(bean.profile?.bitterness) || 0,
        Number(bean.profile?.body) || 0,
        Number(bean.profile?.aroma) || 0,
      );
    });
  });
}

export function getBrewMethods() {
  return db
    .prepare("SELECT * FROM brew_methods ORDER BY created_at ASC")
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      bloomPercent: row.bloom_percent,
      pour1Percent: row.pour1_percent,
      pour2Percent: row.pour2_percent,
      pour3Percent: row.pour3_percent,
      bloomSeconds: row.bloom_seconds,
    }));
}

export function saveBrewMethods(methods) {
  const replace = db.prepare(`
    INSERT INTO brew_methods (id, name, note, bloom_percent, pour1_percent, pour2_percent, pour3_percent, bloom_seconds, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      note = excluded.note,
      bloom_percent = excluded.bloom_percent,
      pour1_percent = excluded.pour1_percent,
      pour2_percent = excluded.pour2_percent,
      pour3_percent = excluded.pour3_percent,
      bloom_seconds = excluded.bloom_seconds,
      updated_at = CURRENT_TIMESTAMP
  `);
  transaction(() => {
    db.prepare("DELETE FROM brew_methods WHERE id NOT IN (SELECT value FROM json_each(?))").run(
      JSON.stringify(methods.map((method) => method.id)),
    );
    methods.forEach((method) => {
      replace.run(
        method.id,
        method.name,
        method.note,
        Number(method.bloomPercent) || 0,
        Number(method.pour1Percent) || 0,
        Number(method.pour2Percent) || 0,
        Number(method.pour3Percent) || 0,
        Number(method.bloomSeconds) || 0,
      );
    });
  });
}

export function getRecipes() {
  const recipes = db.prepare("SELECT * FROM blend_recipes ORDER BY saved_at DESC").all();
  const recipeBeans = db.prepare("SELECT bean_id, ratio FROM blend_recipe_beans WHERE recipe_id = ? ORDER BY rowid ASC");

  return recipes.map((row) => ({
    id: row.id,
    name: row.name,
    ratios: recipeBeans.all(row.id).map((bean) => ({ id: bean.bean_id, value: bean.ratio })),
    doseGram: row.dose_gram,
    brewRatio: row.brew_ratio,
    targetBrewGram: row.target_brew_gram,
    blendCost: row.blend_cost,
    brewMethodId: row.brew_method_id,
    brewMethodSnapshot: parseJson(row.brew_method_snapshot, null),
    sensory: parseJson(row.sensory, {}),
    memo: row.memo,
    savedAt: row.saved_at,
  }));
}

export function saveRecipes(recipes) {
  if ((recipes || []).some((item) => Array.isArray(item.versions))) {
    saveRecipeSeries(recipes);
    return;
  }
  saveRecipeSeries(recipesToSeries(recipes));
}

export function getRecipeSeries() {
  const seriesRows = db.prepare("SELECT * FROM recipe_series ORDER BY updated_at DESC, created_at DESC").all();
  const versionRows = db.prepare("SELECT * FROM recipe_versions WHERE series_id = ? ORDER BY version DESC, saved_at DESC");
  const versionBeans = db.prepare("SELECT bean_id, ratio, roast_level, bean_snapshot FROM recipe_version_beans WHERE version_id = ? ORDER BY rowid ASC");

  return seriesRows.map((series) => {
    const versions = versionRows.all(series.id).map((version) => ({
      id: version.id,
      seriesId: version.series_id,
      version: version.version,
      name: version.name,
      changeNote: version.change_note,
      memo: version.tasting_note,
      ratios: versionBeans.all(version.id).map((bean) => ({
        id: bean.bean_id,
        value: bean.ratio,
        roastLevel: bean.roast_level || "",
        beanSnapshot: parseJson(bean.bean_snapshot, null),
      })),
      doseGram: version.dose_gram,
      brewRatio: version.brew_ratio,
      targetBrewGram: version.target_brew_gram,
      blendCost: version.blend_cost,
      brewMethodId: version.brew_method_id,
      brewMethodSnapshot: parseJson(version.brew_method_snapshot, null),
      sensory: parseJson(version.sensory, {}),
      savedAt: version.saved_at,
    }));

    return {
      id: series.id,
      name: series.name,
      goal: series.goal,
      status: series.status,
      currentVersionId: series.current_version_id,
      createdAt: series.created_at,
      updatedAt: series.updated_at,
      versions,
    };
  });
}

export function saveRecipeSeries(seriesList) {
  const insertSeries = db.prepare(`
    INSERT INTO recipe_series (id, name, goal, status, current_version_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVersion = db.prepare(`
    INSERT INTO recipe_versions (
      id, series_id, version, name, change_note, tasting_note, dose_gram, brew_ratio,
      target_brew_gram, blend_cost, brew_method_id, brew_method_snapshot, sensory,
      saved_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBean = db.prepare(`
    INSERT INTO recipe_version_beans (version_id, bean_id, ratio, roast_level, bean_snapshot)
    VALUES (?, ?, ?, ?, ?)
  `);

  transaction(() => {
    db.prepare("DELETE FROM recipe_series").run();
    (seriesList || []).forEach((series) => {
      const versions = normalizeSeriesVersions(series);
      if (versions.length === 0) return;
      const seriesId = series.id || `series-${versions[0].id || Date.now()}`;
      const latest = versions[0];
      const createdAt = series.createdAt || latest.savedAt || new Date().toISOString();
      const updatedAt = series.updatedAt || latest.savedAt || createdAt;
      insertSeries.run(
        seriesId,
        series.name || latest.name || "無題のシリーズ",
        series.goal || "",
        series.status || "active",
        series.currentVersionId || latest.id,
        createdAt,
        updatedAt,
      );

      versions.forEach((version, index) => {
        const versionId = version.id || `${seriesId}-v${version.version || index + 1}`;
        insertVersion.run(
          versionId,
          seriesId,
          Number(version.version) || index + 1,
          version.name || series.name || "無題のレシピ",
          version.changeNote || "",
          version.memo || version.tastingNote || "",
          Number(version.doseGram) || 0,
          Number(version.brewRatio) || 0,
          Number(version.targetBrewGram) || 0,
          Number(version.blendCost) || 0,
          version.brewMethodId || null,
          JSON.stringify(version.brewMethodSnapshot || null),
          JSON.stringify(version.sensory || {}),
          version.savedAt || new Date().toISOString(),
          version.createdAt || version.savedAt || new Date().toISOString(),
          version.updatedAt || version.savedAt || new Date().toISOString(),
        );

        (version.ratios || []).forEach((ratio) => {
          insertBean.run(
            versionId,
            ratio.id,
            Number(ratio.value) || 0,
            ratio.roastLevel || "",
            JSON.stringify(ratio.beanSnapshot || null),
          );
        });
      });
    });
  });
}

function migrateRecipesToSeries() {
  const seriesCount = db.prepare("SELECT COUNT(*) AS count FROM recipe_series").get().count;
  const oldRecipeCount = db.prepare("SELECT COUNT(*) AS count FROM blend_recipes").get().count;
  if (seriesCount > 0 || oldRecipeCount === 0) return;

  const beansById = new Map(getBeans().map((bean) => [bean.id, bean]));
  const series = getRecipes().map((recipe) => ({
    id: `series-${recipe.id}`,
    name: recipe.name,
    goal: "",
    status: "active",
    currentVersionId: recipe.id,
    createdAt: recipe.savedAt,
    updatedAt: recipe.savedAt,
    versions: [
      {
        ...recipe,
        seriesId: `series-${recipe.id}`,
        version: 1,
        changeNote: "既存レシピから移行",
        ratios: recipe.ratios.map((ratio) => ({
          ...ratio,
          roastLevel: ratio.roastLevel || "",
          beanSnapshot: snapshotBean(beansById.get(ratio.id)),
        })),
      },
    ],
  }));
  saveRecipeSeries(series);
}

function recipesToSeries(recipes) {
  return (recipes || []).map((recipe) => ({
    id: recipe.seriesId || `series-${recipe.id || recipe.name}`,
    name: recipe.name || "無題のシリーズ",
    goal: "",
    status: "active",
    currentVersionId: recipe.id,
    createdAt: recipe.savedAt,
    updatedAt: recipe.savedAt,
    versions: [
      {
        ...recipe,
        seriesId: recipe.seriesId || `series-${recipe.id || recipe.name}`,
        version: recipe.version || 1,
        changeNote: recipe.changeNote || "",
      },
    ],
  }));
}

function normalizeSeriesVersions(series) {
  return [...(series.versions || [])].sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

function snapshotBean(bean) {
  if (!bean) return null;
  return {
    id: bean.id,
    name: bean.name,
    note: bean.note,
    color: bean.color,
    visibleInRecipes: bean.visibleInRecipes !== false,
    costPerKg: bean.costPerKg,
    profile: bean.profile,
  };
}

function saveLegacyRecipes(recipes) {
  const insertRecipe = db.prepare(`
    INSERT INTO blend_recipes (
      id, name, dose_gram, brew_ratio, target_brew_gram, blend_cost,
      brew_method_id, brew_method_snapshot, sensory, memo, saved_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const insertBean = db.prepare("INSERT INTO blend_recipe_beans (recipe_id, bean_id, ratio) VALUES (?, ?, ?)");
  transaction(() => {
    db.prepare("DELETE FROM blend_recipes").run();
    recipes.forEach((recipe) => {
      const id = recipe.id || `${recipe.name}-${recipe.savedAt}`;
      insertRecipe.run(
        id,
        recipe.name,
        Number(recipe.doseGram) || 0,
        Number(recipe.brewRatio) || 0,
        Number(recipe.targetBrewGram) || 0,
        Number(recipe.blendCost) || 0,
        recipe.brewMethodId || null,
        JSON.stringify(recipe.brewMethodSnapshot || null),
        JSON.stringify(recipe.sensory || {}),
        recipe.memo || "",
        recipe.savedAt || new Date().toISOString(),
      );
      (recipe.ratios || []).forEach((ratio) => {
        insertBean.run(id, ratio.id, Number(ratio.value) || 0);
      });
    });
  });
}

export function getSetting(key, fallback) {
  return db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key)?.value ?? fallback;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}
