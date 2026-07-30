import React, { useRef, useState } from "react";

export function AuthScreen({ error, onSignIn, onSignUp, onClearError }) {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const isSignUp = mode === "signUp";

  async function submit(event) {
    event.preventDefault();
    if (processingRef.current) return;

    const validationError = validate(email, password);
    setLocalError(validationError);
    setConfirmationMessage("");
    onClearError?.();
    if (validationError) return;

    processingRef.current = true;
    setProcessing(true);
    let result;
    try {
      result = isSignUp ? await onSignUp(email, password) : await onSignIn(email, password);
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }

    if (result?.emailConfirmationRequired) {
      setConfirmationMessage("確認メールを送信しました。メール内のリンクから登録を完了してください");
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setLocalError("");
    setConfirmationMessage("");
    onClearError?.();
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="authTitle">
        <p className="eyebrow">Coffee Blend Studio</p>
        <h1 id="authTitle">Coffee Blend Lab</h1>
        <p className="auth-copy">メールアドレスでログインして、ブレンドとレシピを管理します。</p>
        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button type="button" data-active={!isSignUp} onClick={() => switchMode("signIn")}>
            ログイン
          </button>
          <button type="button" data-active={isSignUp} onClick={() => switchMode("signUp")}>
            新規登録
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            メールアドレス
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              disabled={processing}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              onChange={(event) => setPassword(event.target.value)}
              disabled={processing}
            />
          </label>
          {(localError || error) && (
            <p className="auth-message" data-status="error">
              {localError || error}
            </p>
          )}
          {confirmationMessage && (
            <p className="auth-message" data-status="success">
              {confirmationMessage}
            </p>
          )}
          <button type="submit" className="primary-action" disabled={processing}>
            {processing ? "処理中..." : isSignUp ? "新規登録" : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}

function validate(email, password) {
  if (!email.trim()) return "メールアドレスを入力してください";
  if (!password.trim()) return "パスワードを入力してください";
  if (password.trim().length < 8) return "パスワードは8文字以上で入力してください";
  return "";
}
