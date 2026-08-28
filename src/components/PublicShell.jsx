import React, { lazy, Suspense, useState } from "react";
import { AuthScreen } from "./AuthScreen.jsx";
import { isLegalPage, LegalPage } from "./LegalPages.jsx";

const DiscoverPage = lazy(() => import("./DiscoverPage.jsx"));

const publicPages = [
  ["discover", "Discover"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
  ["contact", "Contact"],
  ["login", "Login"],
];

export function PublicShell({ auth, logoSrc, initialPage = "discover", discoverRepository }) {
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
          {activePage === "discover" && (
            <Suspense fallback={<p className="discover-state" role="status">Discoverを読み込んでいます...</p>}>
              <DiscoverPage discoverRepository={discoverRepository} onLogin={() => setActivePage("login")} />
            </Suspense>
          )}
          {isLegalPage(activePage) && <LegalPage page={activePage} onBack={() => setActivePage("discover")} />}
        </main>
      )}
    </>
  );
}
