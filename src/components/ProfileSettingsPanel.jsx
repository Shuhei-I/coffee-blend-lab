import React, { useEffect, useMemo, useState } from "react";
import { normalizeUsername, validateProfileInput } from "../data/supabaseProfileRepository.js";

const emptyProfile = {
  username: "",
  displayName: "",
  bio: "",
  avatarPath: null,
};

export function ProfileSettingsPanel({ profile, loading, loadError, saveError, saveStatus, onSave }) {
  const [draft, setDraft] = useState(() => normalizeProfile(profile));

  useEffect(() => {
    setDraft(normalizeProfile(profile));
  }, [profile]);

  const validation = useMemo(
    () =>
      validateProfileInput({
        username: draft.username,
        displayName: draft.displayName,
        bio: draft.bio,
      }),
    [draft.bio, draft.displayName, draft.username],
  );
  const normalizedUsername = normalizeUsername(draft.username);
  const disabled = loading || saveStatus === "saving" || !validation.valid;

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (disabled) return;
    await onSave?.({
      ...draft,
      username: normalizedUsername,
    });
  }

  return (
    <section className="panel profile-settings-panel" aria-labelledby="profileSettingsTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public Profile</p>
          <h2 id="profileSettingsTitle">公開プロフィール</h2>
        </div>
      </div>

      <form className="profile-settings-form" onSubmit={handleSubmit}>
        <label>
          <span>Username</span>
          <input
            type="text"
            value={draft.username}
            placeholder="your_coffee_name"
            autoComplete="off"
            onChange={(event) => updateField("username", event.target.value)}
          />
        </label>
        <label>
          <span>表示名</span>
          <input
            type="text"
            value={draft.displayName}
            placeholder="あなたのニックネーム"
            maxLength={60}
            onChange={(event) => updateField("displayName", event.target.value)}
          />
        </label>
        <label>
          <span>自己紹介</span>
          <textarea
            value={draft.bio}
            placeholder="ブレンドの好みや実験テーマ"
            maxLength={160}
            rows={3}
            onChange={(event) => updateField("bio", event.target.value)}
          />
        </label>

        <div className="profile-settings-footer">
          <div className="profile-settings-status" role="status">
            {loading && "読み込み中..."}
            {loadError && "プロフィールを読み込めませんでした。"}
            {!loading && !loadError && !validation.valid && validation.reason}
            {saveError && saveError.message}
            {saveStatus === "saving" && "保存中..."}
            {saveStatus === "saved" && !loading && !loadError && !saveError && validation.valid && "保存済み"}
          </div>
          <button type="submit" disabled={disabled}>
            保存
          </button>
        </div>
      </form>
    </section>
  );
}

function normalizeProfile(profile) {
  return {
    ...emptyProfile,
    ...(profile || {}),
    username: profile?.username || "",
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    avatarPath: profile?.avatarPath || null,
  };
}
