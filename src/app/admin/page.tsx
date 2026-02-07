"use client";

import { useEffect, useState } from "react";
import DrivePicker, { DriveItem } from "./DrivePicker";

type Token = {
  token: string;
  video_id: string;
  session_id: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  max_sessions: number;
  session_count: number;
};

type Video = {
  id: string;
  title: string | null;
  drive_file_id: string;
  drive_url: string;
  created_at: string;
  tokens?: Token[];
};

type DriveStatus = {
  connected: boolean;
  error?: string | null;
};

export default function AdminPage() {
  const [driveUrl, setDriveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxSessions, setMaxSessions] = useState(1);

  const loadVideos = async () => {
    const res = await fetch("/api/videos");
    const data = await res.json();
    setVideos(data.videos ?? []);
  };

  const loadDriveStatus = async () => {
    const res = await fetch("/api/google/status");
    const data = (await res.json()) as DriveStatus;
    setDriveStatus(data);
  };

  useEffect(() => {
    loadVideos();
    loadDriveStatus();
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveUrl, title: title || null }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to add video");
    } else {
      setDriveUrl("");
      setTitle("");
      setMessage("Video added.");
      await loadVideos();
    }

    setLoading(false);
  };

  const onSelectDriveVideo = async (file: DriveItem) => {
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/google/drive/file?fileId=" + file.id);
    const fileData = await res.json();

    if (!res.ok) {
      setMessage(fileData.error || "Unable to load Drive file");
      setLoading(false);
      return;
    }

    const createRes = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driveFileId: file.id,
        driveUrl: fileData.webViewLink,
        title: title || file.name || null,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      setMessage(createData.error || "Unable to add video");
    } else {
      setMessage("Video added from Drive.");
      setTitle("");
      await loadVideos();
    }

    setLoading(false);
  };

  const createToken = async (videoId: string) => {
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        expiresAt: expiresAt.toISOString(),
        maxSessions,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to create link");
      return;
    }

    const link = `${window.location.origin}/v/${data.token}`;
    await navigator.clipboard.writeText(link);
    setMessage(`Secure link copied: ${link}`);
    await loadVideos();
  };

  const resetSession = async (token: string) => {
    const res = await fetch(`/api/tokens/${token}/reset`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to reset session");
      return;
    }
    setMessage("Session reset.");
    await loadVideos();
  };

  const revokeToken = async (token: string) => {
    const res = await fetch(`/api/tokens/${token}/revoke`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to revoke link");
      return;
    }
    setMessage("Link revoked.");
    await loadVideos();
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  };

  const isExpired = (token: Token) => {
    return new Date(token.expires_at).getTime() <= Date.now();
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Video Vault Admin</h1>
            <p className="text-sm text-zinc-600">Add Drive links and generate secure viewer links.</p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Logout
          </button>
        </header>

        <section className="space-y-4 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Drive</h2>
              <p className="text-sm text-zinc-600">
                {driveStatus?.connected
                  ? "Service account connected. You can browse shared Drive videos."
                  : "Service account not configured. Add credentials to enable Drive browsing."}
              </p>
              {!driveStatus?.connected && driveStatus?.error && (
                <p className="text-xs text-red-600">{driveStatus.error}</p>
              )}
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {driveStatus?.connected ? "Service Account Connected" : "Not Connected"}
            </div>
          </div>
          {driveStatus?.connected && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold">Pick a video</h3>
              <p className="text-xs text-zinc-500">
                Browse folders shared with the service account and select a video.
              </p>
              <div className="mt-3">
                <DrivePicker onSelect={onSelectDriveVideo} />
              </div>
            </div>
          )}
          {!driveStatus?.connected && (
            <p className="text-xs text-zinc-500">
              You can still paste a public Drive link below if you prefer.
            </p>
          )}
        </section>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow">
          <div className="space-y-2">
            <label className="text-sm font-medium">Google Drive Link</label>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
              value={driveUrl}
              onChange={(event) => setDriveUrl(event.target.value)}
              placeholder="https://drive.google.com/file/d/.../view"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title (optional)</label>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Customer onboarding"
            />
          </div>
          <button
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Video"}
          </button>
          {message && <p className="text-sm text-zinc-600">{message}</p>}
        </form>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Videos</h2>
              <p className="text-xs text-zinc-500">Create secure links with expiration and session limits.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Expires in (days)</label>
                <input
                  type="number"
                  min={1}
                  value={expiresDays}
                  onChange={(event) => setExpiresDays(Math.max(1, Number(event.target.value) || 1))}
                  className="w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Max sessions</label>
                <input
                  type="number"
                  min={1}
                  value={maxSessions}
                  onChange={(event) => setMaxSessions(Math.max(1, Number(event.target.value) || 1))}
                  className="w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Drive File ID</th>
                  <th className="px-4 py-3">Secure Link</th>
                  <th className="px-4 py-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} className="border-t align-top">
                    <td className="px-4 py-3">{video.title ?? "Untitled"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{video.drive_file_id}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => createToken(video.id)}
                        className="rounded bg-zinc-900 px-3 py-1 text-white"
                      >
                        Create Link
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-3">
                        {(video.tokens ?? []).map((token) => {
                          const expired = isExpired(token);
                          const revoked = Boolean(token.revoked_at);
                          return (
                            <div key={token.token} className="rounded-lg border border-zinc-200 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-mono text-xs">{token.token}</p>
                                  <p className="text-xs text-zinc-500">
                                    Created {formatDate(token.created_at)} · Expires {formatDate(token.expires_at)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span
                                    className={`rounded-full px-2 py-1 ${
                                      revoked
                                        ? "bg-red-100 text-red-700"
                                        : expired
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {revoked ? "Revoked" : expired ? "Expired" : "Active"}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-1 ${
                                      token.session_id
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-zinc-100 text-zinc-600"
                                    }`}
                                  >
                                    {token.session_id
                                      ? `Locked (${token.session_count}/${token.max_sessions})`
                                      : `Unlocked (${token.session_count}/${token.max_sessions})`}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => resetSession(token.token)}
                                  className="rounded border border-zinc-300 px-3 py-1 text-xs"
                                >
                                  Reset Session
                                </button>
                                <button
                                  onClick={() => revokeToken(token.token)}
                                  className="rounded border border-red-200 px-3 py-1 text-xs text-red-600"
                                >
                                  Revoke
                                </button>
                                <button
                                  onClick={async () => {
                                    const link = `${window.location.origin}/v/${token.token}`;
                                    await navigator.clipboard.writeText(link);
                                    setMessage(`Secure link copied: ${link}`);
                                  }}
                                  className="rounded border border-zinc-300 px-3 py-1 text-xs"
                                >
                                  Copy Link
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {(video.tokens?.length ?? 0) === 0 && (
                          <p className="text-xs text-zinc-500">No secure links yet.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {videos.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-zinc-500" colSpan={4}>
                      No videos yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
