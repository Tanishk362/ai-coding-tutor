"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

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
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    // Apply language setting for reCAPTCHA and SMS text localization
    const lang = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_LANGUAGE || "").trim();
    if (lang) {
      auth.languageCode = lang;
    } else {
      // Use browser/device language if not explicitly configured
      // @ts-ignore - useDeviceLanguage exists on Auth
      auth.useDeviceLanguage?.();
    }
  }
  return auth!;
}

// Builds an invisible reCAPTCHA verifier attached to a container div id
export function buildRecaptcha(containerId = "recaptcha-container") {
  const a = getFirebaseAuth();
  const verifier = new RecaptchaVerifier(a, containerId, { size: "invisible" });
  return verifier;
}

export async function sendOtpFirebase(phoneE164: string, containerId?: string): Promise<ConfirmationResult> {
  const a = getFirebaseAuth();
  const verifier = buildRecaptcha(containerId);
  return await signInWithPhoneNumber(a, phoneE164, verifier);
}

export async function currentIdToken(): Promise<string> {
  const a = getFirebaseAuth();
  const user = a.currentUser;
  if (!user) throw new Error("Firebase user not signed in");
  return await user.getIdToken();
}
