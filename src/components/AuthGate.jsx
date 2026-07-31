import React from "react";
import { AuthScreen } from "./AuthScreen.jsx";

export function AuthGate({ auth, children }) {
  if (auth.loading) {
    return <StatusScreen title="読み込み中" message="認証状態を確認しています..." />;
  }

  if (!auth.session) {
    return (
      <AuthScreen
        error={auth.error}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onClearError={auth.clearError}
      />
    );
  }

  if (auth.isInitializingUser) {
    return <StatusScreen title="初期データ準備中" message="Coffee Blend Labの初期データを準備しています..." />;
  }

  if (auth.initializationError) {
    return (
      <StatusScreen title="初期化エラー" message={auth.initializationError}>
        <div className="auth-error-actions">
          <button type="button" onClick={auth.retryInitializeUser}>
            再試行
          </button>
          <button type="button" onClick={auth.signOut}>
            ログアウト
          </button>
        </div>
      </StatusScreen>
    );
  }

  return children;
}

function StatusScreen({ title, message, children }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="statusTitle">
        <p className="eyebrow">Coffee Blend Studio</p>
        <h1 id="statusTitle">{title}</h1>
        <p className="auth-copy">{message}</p>
        {children}
      </section>
    </main>
  );
}
