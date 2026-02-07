"use client";

import { useEffect, useState } from "react";
import DrivePicker, { DriveItem } from "./DrivePicker";

type Video = {
  id: string;
  title: string | null;
  drive_file_id: string;
  drive_url: string;
  created_at: string;
};

type DriveStatus = {
  connected: boolean;
  expiresAt: string | null;
};

export default function AdminPage() {
  const [driveUrl, setDriveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);

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
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to create link");
      return;
    }

    const link = `${window.location.origin}/v/${data.token}`;
    await navigator.clipboard.writeText(link);
    setMessage(`Secure link copied: ${link}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-10">
        <header>
          <h1 className="text-3xl font-semibold">Video Vault Admin</h1>
          <p className="text-sm text-zinc-600">Add Drive links and generate secure viewer links.</p>
        </header>

        <section className="space-y-4 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Drive</h2>
              <p className="text-sm text-zinc-600">
                {driveStatus?.connected
                  ? "Connected. You can browse private Drive videos."
                  : "Connect once to browse your Drive securely."}
              </p>
            </div>
            <a
              href="/api/google/auth/start"
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm text-white"
            >
              {driveStatus?.connected ? "Reconnect Drive" : "Connect Google Drive"}
            </a>
          </div>
          {driveStatus?.connected && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold">Pick a video</h3>
              <p className="text-xs text-zinc-500">
                Browse folders and select a video. We’ll save the file ID automatically.
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
          <h2 className="text-xl font-semibold">Videos</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Drive File ID</th>
                  <th className="px-4 py-3">Secure Link</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} className="border-t">
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
                  </tr>
                ))}
                {videos.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-zinc-500" colSpan={3}>
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
