import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

let dom;
let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  container = document.getElementById("root");
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
  vi.restoreAllMocks();
});

describe("useAuth", () => {
  test("loads an existing session and initializes the user", async () => {
    const session = createSession("user-1");
    const client = createClient({ session });
    const rendered = await renderUseAuth(client);

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.session).toBe(session);
    expect(rendered.current.user).toBe(session.user);
    expect(client.rpc).toHaveBeenCalledWith("initialize_user_defaults");
    expect(rendered.current.initializationError).toBeNull();
  });

  test("loads without a session", async () => {
    const client = createClient({ session: null });
    const rendered = await renderUseAuth(client);

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.session).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  test("keeps getSession errors visible", async () => {
    const client = createClient({ getSessionError: new Error("session failed") });
    const rendered = await renderUseAuth(client);

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.session).toBeNull();
    expect(rendered.current.error).toBe("session failed");
  });

  test("updates session from auth state changes and unsubscribes on unmount", async () => {
    const client = createClient({ session: null });
    const rendered = await renderUseAuth(client);
    const nextSession = createSession("user-2");

    await act(async () => {
      client.emitAuth("SIGNED_IN", nextSession);
      await flush();
    });

    expect(rendered.current.session).toBe(nextSession);
    expect(client.rpc).toHaveBeenCalledTimes(1);

    act(() => {
      rendered.unmount();
    });
    expect(client.unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("signUp supports an immediate session", async () => {
    const session = createSession("user-1");
    const client = createClient({ session: null, signUpResult: { data: { session }, error: null } });
    const rendered = await renderUseAuth(client);

    let result;
    await act(async () => {
      result = await rendered.current.signUp(" user@example.com ", " password123 ");
      await flush();
    });

    expect(client.auth.signUp).toHaveBeenCalledWith({ email: "user@example.com", password: "password123" });
    expect(result).toEqual({ ok: true, emailConfirmationRequired: false });
    expect(rendered.current.session).toBe(session);
    expect(client.rpc).toHaveBeenCalledWith("initialize_user_defaults");
  });

  test("signUp supports email confirmation without a session", async () => {
    const client = createClient({ session: null, signUpResult: { data: { session: null }, error: null } });
    const rendered = await renderUseAuth(client);

    let result;
    await act(async () => {
      result = await rendered.current.signUp("user@example.com", "password123");
      await flush();
    });

    expect(result).toEqual({ ok: true, emailConfirmationRequired: true });
    expect(rendered.current.session).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  test("signUp failure is exposed", async () => {
    const client = createClient({ session: null, signUpResult: { data: {}, error: new Error("signup failed") } });
    const rendered = await renderUseAuth(client);

    let result;
    await act(async () => {
      result = await rendered.current.signUp("user@example.com", "password123");
    });

    expect(result).toEqual({ ok: false, error: "signup failed" });
    expect(rendered.current.error).toBe("signup failed");
  });

  test("signIn success and failure keep the existing contract", async () => {
    const session = createSession("user-1");
    const client = createClient({ session: null, signInResult: { data: { session }, error: null } });
    const rendered = await renderUseAuth(client);

    await act(async () => {
      await rendered.current.signIn(" user@example.com ", " password123 ");
      await flush();
    });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
    expect(rendered.current.session).toBe(session);

    client.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: new Error("login failed") });
    await act(async () => {
      await rendered.current.signIn("user@example.com", "password123");
    });
    expect(rendered.current.error).toBe("login failed");
  });

  test("signOut success and failure are visible", async () => {
    const client = createClient({ session: createSession("user-1") });
    const rendered = await renderUseAuth(client);

    await act(async () => {
      await rendered.current.signOut();
    });
    expect(rendered.current.session).toBeNull();

    client.auth.signOut.mockResolvedValueOnce({ error: new Error("logout failed") });
    await act(async () => {
      await rendered.current.signOut();
    });
    expect(rendered.current.error).toBe("logout failed");
  });

  test("does not repeatedly initialize the same user but initializes another user", async () => {
    const userOne = createSession("user-1");
    const userTwo = createSession("user-2");
    const client = createClient({ session: userOne });
    await renderUseAuth(client);

    await act(async () => {
      client.emitAuth("TOKEN_REFRESHED", userOne);
      await flush();
    });
    expect(client.rpc).toHaveBeenCalledTimes(1);

    await act(async () => {
      client.emitAuth("SIGNED_IN", userTwo);
      await flush();
    });
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  test("stores RPC failures without logging out", async () => {
    const session = createSession("user-1");
    const client = createClient({ session, rpcResult: { data: null, error: new Error("rpc failed") } });
    const rendered = await renderUseAuth(client);

    expect(rendered.current.session).toBe(session);
    expect(rendered.current.initializationError).toBe("rpc failed");
    expect(rendered.current.isInitializingUser).toBe(false);
  });
});

async function renderUseAuth(client) {
  const { useAuth } = await import("./useAuth.js");
  const rendered = { current: null };

  function TestComponent() {
    rendered.current = useAuth({ client });
    return null;
  }

  await act(async () => {
    root = createRoot(container);
    root.render(<TestComponent />);
    await flush();
  });

  return {
    get current() {
      return rendered.current;
    },
    unmount() {
      root.unmount();
      root = undefined;
    },
  };
}

function createClient({
  session = null,
  getSessionError = null,
  signUpResult = { data: { session: null }, error: null },
  signInResult = { data: { session: null }, error: null },
  signOutResult = { error: null },
  rpcResult = { data: { initialized: true }, error: null },
} = {}) {
  let authCallback = null;
  const unsubscribe = vi.fn();
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: getSessionError })),
      onAuthStateChange: vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
      signUp: vi.fn(async () => signUpResult),
      signInWithPassword: vi.fn(async () => signInResult),
      signOut: vi.fn(async () => signOutResult),
    },
    rpc: vi.fn(async () => rpcResult),
    unsubscribe,
    emitAuth(event, nextSession) {
      authCallback?.(event, nextSession);
    },
  };
}

function createSession(userId) {
  return { user: { id: userId, email: `${userId}@example.com` } };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}
