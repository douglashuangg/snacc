import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { requireSupabase, supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export function getAuthRedirectUri() {
  return Linking.createURL("auth/callback");
}

function getParamsFromUrl(url: string): Record<string, string> {
  const parsed = Linking.parse(url);
  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
    if (typeof value === "string") params[key] = value;
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    for (const part of hash.split("&")) {
      const [rawKey, rawValue = ""] = part.split("=");
      if (!rawKey) continue;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    }
  }

  return params;
}

async function createSessionFromUrl(url: string) {
  const params = getParamsFromUrl(url);
  if (params.error || params.error_code) {
    throw new Error(
      params.error_description ||
        params.error ||
        params.error_code ||
        "Google sign-in failed",
    );
  }

  const { access_token, refresh_token, code } = params;

  // Prefer tokens from the redirect (Supabase Expo OAuth pattern).
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  throw new Error("Google sign-in did not return a session");
}

export async function signInWithGoogle() {
  requireSupabase();
  const redirectTo = getAuthRedirectUri();
  if (__DEV__) {
    console.log("[auth] Google redirectTo — add to Supabase Redirect URLs:", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in URL was not returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    throw new Error(
      result.type === "cancel" || result.type === "dismiss"
        ? "Google sign-in was cancelled"
        : "Google sign-in failed",
    );
  }

  await createSessionFromUrl(result.url);
}
