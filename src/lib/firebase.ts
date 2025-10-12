"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let cachedVerifier: RecaptchaVerifier | null = null;

export function getFirebaseApp() {
  if (typeof window === "undefined") throw new Error("Firebase can only run in the browser");
  if (app) return app;
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  } as const;
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
    throw new Error("Missing Firebase env vars: NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,APP_ID}");
  }
  app = getApps()?.[0] || initializeApp(cfg);
  return app;
}

export function getFirebaseAuth() {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth!;
}

// Options to control how the reCAPTCHA renders
export type RecaptchaBuildOptions = {
  // If true, show a visible widget; otherwise use invisible captcha
  visible?: boolean;
  // Explicit size override; defaults to 'normal' for visible and 'invisible' otherwise
  size?: "normal" | "compact" | "invisible";
  // Visual theme for visible captcha
  theme?: "light" | "dark";
  // Badge position for invisible captcha
  badge?: "bottomright" | "bottomleft" | "inline";
};

// Builds a reCAPTCHA verifier attached to a container div id
export function buildRecaptcha(
  containerId = "recaptcha-container",
  options: RecaptchaBuildOptions = {}
) {
  const a = getFirebaseAuth();
  const { visible = false, size, theme, badge } = options;
  const resolvedSize = size ?? (visible ? "normal" : "invisible");
  const verifier = new RecaptchaVerifier(a, containerId, {
    size: resolvedSize,
    theme,
    badge,
  } as any);
  return verifier;
}

// Ensure a single RecaptchaVerifier instance exists and is rendered
export async function ensureRecaptcha(
  containerId = "recaptcha-container",
  options: RecaptchaBuildOptions = {}
): Promise<RecaptchaVerifier> {
  if (cachedVerifier) {
    try { await (cachedVerifier as any).render?.(); } catch {}
    return cachedVerifier;
  }
  const v = buildRecaptcha(containerId, options);
  try { await (v as any).render?.(); } catch {}
  (window as any).__recaptchaVerifier = v;
  cachedVerifier = v;
  return v;
}

export async function sendOtpFirebase(
  phoneE164: string,
  containerId?: string,
  options?: RecaptchaBuildOptions
): Promise<ConfirmationResult> {
  const a = getFirebaseAuth();
  const verifier = await ensureRecaptcha(containerId, options);
  return await signInWithPhoneNumber(a, phoneE164, verifier);
}

export async function currentIdToken(): Promise<string> {
  const a = getFirebaseAuth();
  const user = a.currentUser;
  if (!user) throw new Error("Firebase user not signed in");
  return await user.getIdToken();
}
