import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export type VideoRecord = {
  id: string;
  title: string | null;
  drive_file_id: string;
  drive_url: string;
  created_at: string;
};

export type VideoTokenRecord = {
  token: string;
  video_id: string;
  session_id: string | null;
  created_at: string;
};

function toIso(value: Timestamp | Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export async function listVideos(): Promise<VideoRecord[]> {
  const db = await getFirebaseAdminDb();
  const snapshot = await db.collection("videos").orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: (data.title as string | null) ?? null,
      drive_file_id: String(data.drive_file_id ?? ""),
      drive_url: String(data.drive_url ?? ""),
      created_at: toIso(data.created_at as Timestamp | Date | string | undefined),
    };
  });
}

export async function createVideo(params: {
  title: string | null;
  drive_file_id: string;
  drive_url: string;
}): Promise<VideoRecord> {
  const db = await getFirebaseAdminDb();
  const ref = db.collection("videos").doc();
  const createdAt = Timestamp.now();

  await ref.set({
    title: params.title,
    drive_file_id: params.drive_file_id,
    drive_url: params.drive_url,
    created_at: createdAt,
  });

  return {
    id: ref.id,
    title: params.title,
    drive_file_id: params.drive_file_id,
    drive_url: params.drive_url,
    created_at: createdAt.toDate().toISOString(),
  };
}

export async function getVideoById(id: string): Promise<VideoRecord | null> {
  const db = await getFirebaseAdminDb();
  const doc = await db.collection("videos").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    title: (data.title as string | null) ?? null,
    drive_file_id: String(data.drive_file_id ?? ""),
    drive_url: String(data.drive_url ?? ""),
    created_at: toIso(data.created_at as Timestamp | Date | string | undefined),
  };
}

export async function createVideoToken(params: {
  token: string;
  video_id: string;
  session_id?: string | null;
}): Promise<VideoTokenRecord> {
  const db = await getFirebaseAdminDb();
  const createdAt = Timestamp.now();
  const ref = db.collection("video_tokens").doc(params.token);
  await ref.set({
    token: params.token,
    video_id: params.video_id,
    session_id: params.session_id ?? null,
    created_at: createdAt,
  });

  return {
    token: params.token,
    video_id: params.video_id,
    session_id: params.session_id ?? null,
    created_at: createdAt.toDate().toISOString(),
  };
}

export async function getVideoToken(token: string): Promise<VideoTokenRecord | null> {
  const db = await getFirebaseAdminDb();
  const doc = await db.collection("video_tokens").doc(token).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    token: String(data.token ?? doc.id),
    video_id: String(data.video_id ?? ""),
    session_id: (data.session_id as string | null) ?? null,
    created_at: toIso(data.created_at as Timestamp | Date | string | undefined),
  };
}

export async function lockVideoTokenSession(token: string, sessionId: string): Promise<boolean> {
  const db = await getFirebaseAdminDb();
  const ref = db.collection("video_tokens").doc(token);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { ok: false, reason: "missing" } as const;
    }
    const data = snap.data() as { session_id?: string | null };
    if (data?.session_id && data.session_id !== sessionId) {
      return { ok: false, reason: "locked" } as const;
    }
    if (!data?.session_id) {
      tx.update(ref, { session_id: sessionId });
    }
    return { ok: true } as const;
  });

  return result.ok;
}
