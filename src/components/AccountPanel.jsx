import React from "react";

export function AccountPanel({ email, onSignOut }) {
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
    </section>
  );
}
