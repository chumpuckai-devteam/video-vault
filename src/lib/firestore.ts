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
  expires_at: string;
  revoked_at: string | null;
  max_sessions: number;
  session_count: number;
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

export async function listVideoTokensByVideoId(videoId: string): Promise<VideoTokenRecord[]> {
  const db = await getFirebaseAdminDb();
  const snapshot = await db
    .collection("video_tokens")
    .where("video_id", "==", videoId)
    .orderBy("created_at", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      token: String(data.token ?? doc.id),
      video_id: String(data.video_id ?? ""),
      session_id: (data.session_id as string | null) ?? null,
      created_at: toIso(data.created_at as Timestamp | Date | string | undefined),
      expires_at: toIso(data.expires_at as Timestamp | Date | string | undefined),
      revoked_at: data.revoked_at ? toIso(data.revoked_at as Timestamp | Date | string) : null,
      max_sessions: Number(data.max_sessions ?? 1),
      session_count: Number(data.session_count ?? 0),
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
  expires_at?: Date | Timestamp | string | null;
  max_sessions?: number | null;
}): Promise<VideoTokenRecord> {
  const db = await getFirebaseAdminDb();
  const createdAt = Timestamp.now();
  const expiresAt = params.expires_at
    ? params.expires_at instanceof Timestamp
      ? params.expires_at
      : Timestamp.fromDate(new Date(params.expires_at))
    : Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const maxSessions = Math.max(1, Number(params.max_sessions ?? 1));

  const ref = db.collection("video_tokens").doc(params.token);
  await ref.set({
    token: params.token,
    video_id: params.video_id,
    session_id: params.session_id ?? null,
    created_at: createdAt,
    expires_at: expiresAt,
    revoked_at: null,
    max_sessions: maxSessions,
    session_count: 0,
  });

  return {
    token: params.token,
    video_id: params.video_id,
    session_id: params.session_id ?? null,
    created_at: createdAt.toDate().toISOString(),
    expires_at: expiresAt.toDate().toISOString(),
    revoked_at: null,
    max_sessions: maxSessions,
    session_count: 0,
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
    expires_at: toIso(data.expires_at as Timestamp | Date | string | undefined),
    revoked_at: data.revoked_at ? toIso(data.revoked_at as Timestamp | Date | string) : null,
    max_sessions: Number(data.max_sessions ?? 1),
    session_count: Number(data.session_count ?? 0),
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
    const data = snap.data() as {
      session_id?: string | null;
      session_count?: number;
      max_sessions?: number;
    };
    const sessionCount = Number(data?.session_count ?? 0);
    const maxSessions = Math.max(1, Number(data?.max_sessions ?? 1));

    if (data?.session_id && data.session_id !== sessionId) {
      return { ok: false, reason: "locked" } as const;
    }

    if (!data?.session_id) {
      if (sessionCount >= maxSessions) {
        return { ok: false, reason: "maxed" } as const;
      }
      tx.update(ref, {
        session_id: sessionId,
        session_count: sessionCount + 1,
      });
    }

    return { ok: true } as const;
  });

  return result.ok;
}

export async function resetVideoTokenSession(token: string): Promise<void> {
  const db = await getFirebaseAdminDb();
  await db.collection("video_tokens").doc(token).update({ session_id: null });
}

export async function revokeVideoToken(token: string): Promise<void> {
  const db = await getFirebaseAdminDb();
  await db.collection("video_tokens").doc(token).update({ revoked_at: Timestamp.now() });
}
