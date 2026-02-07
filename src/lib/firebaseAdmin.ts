import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedFirestore: Firestore | null = null;

async function loadFirebaseServiceAccount(): Promise<FirebaseServiceAccount> {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH;

  let raw: string | null = null;
  if (jsonEnv && jsonEnv.trim().length > 0) {
    raw = jsonEnv;
  } else if (jsonPath && jsonPath.trim().length > 0) {
    raw = await readFile(jsonPath, "utf8");
  }

  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_PATH");
  }

  let parsed: FirebaseServiceAccount;
  try {
    parsed = JSON.parse(raw) as FirebaseServiceAccount;
  } catch {
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON format");
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("Firebase service account JSON missing project_id, client_email, or private_key");
  }

  return parsed;
}

export async function getFirebaseAdminDb(): Promise<Firestore> {
  if (cachedFirestore) return cachedFirestore;

  const serviceAccount = await loadFirebaseServiceAccount();

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });
  }

  cachedFirestore = getFirestore();
  return cachedFirestore;
}
