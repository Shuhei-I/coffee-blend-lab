import React from "react";

export function AccountPanel({ email, onOpenLegalPage, onSignOut }) {
  return (
    <section className="panel account-panel" aria-labelledby="accountTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="accountTitle">アカウント</h2>
        </div>
      </div>
      <div className="account-card">
        <div>
          <span className="account-label">ログイン中</span>
          <strong>{email || "Signed in"}</strong>
        </div>
        <button className="account-signout-button" type="button" onClick={onSignOut}>
          ログアウト
        </button>
      </div>
      <div className="support-links" aria-label="サポートリンク">
        <button className="ghost-button" type="button" onClick={() => onOpenLegalPage?.("privacy")}>
          Privacy Policy
        </button>
        <button className="ghost-button" type="button" onClick={() => onOpenLegalPage?.("terms")}>
          Terms of Use
        </button>
        <button className="ghost-button" type="button" onClick={() => onOpenLegalPage?.("contact")}>
          Contact / Feedback
        </button>
      </div>
    </section>
  );
}
