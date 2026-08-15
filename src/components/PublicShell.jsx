import React, { useState } from "react";
import { AuthScreen } from "./AuthScreen.jsx";
import { isLegalPage, LegalPage } from "./LegalPages.jsx";

const publicPages = [
  ["discover", "Discover"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
  ["contact", "Contact"],
  ["login", "Login"],
];

export function PublicShell({ auth, logoSrc, initialPage = "discover" }) {
  const [activePage, setActivePage] = useState(initialPage);

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="brand-area">
            <img className="brand-logo" src={logoSrc} alt="Coffee Blend Lab" />
          </div>
          {auth.error && (
            <p className="auth-inline-error" role="alert">
              {auth.error}
            </p>
          )}
        </div>
      </header>

      <nav className="app-nav public-nav" aria-label="公開ページ">
        {publicPages.map(([id, label]) => (
          <button type="button" key={id} data-active={activePage === id} onClick={() => setActivePage(id)}>
            {label}
          </button>
        ))}
      </nav>

      {activePage === "login" ? (
        <AuthScreen
          error={auth.error}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
          onClearError={auth.clearError}
        />
      ) : (
        <main className="workspace single-page public-workspace">
          {activePage === "discover" && <PublicDiscoverIntro onLogin={() => setActivePage("login")} />}
          {isLegalPage(activePage) && <LegalPage page={activePage} onBack={() => setActivePage("discover")} />}
        </main>
      )}
    </>
  );
}

function PublicDiscoverIntro({ onLogin }) {
  return (
    <section className="panel public-discover-panel" aria-labelledby="publicDiscoverTitle">
      <div>
        <p className="eyebrow">Discover</p>
        <h1 id="publicDiscoverTitle">公開ブレンド</h1>
        <p>
          他のユーザーが公開したブレンド記録を見つけ、自分の実験へ取り込める場所です。投稿一覧は次の実装フェーズで追加します。
        </p>
      </div>
      <button type="button" onClick={onLogin}>
        ログインして始める
      </button>
    </section>
  );
}
