"use client";

import { useEffect, useState } from "react";

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
};

type DriveBrowseResponse = {
  folderId: string;
  folders: DriveItem[];
  videos: DriveItem[];
  error?: string;
};

type DrivePickerProps = {
  onSelect: (file: DriveItem) => void;
};

const DEFAULT_FOLDER_ID =
  (process.env.NEXT_PUBLIC_DRIVE_ROOT_FOLDER_ID || "").trim() || "root";

export default function DrivePicker({ onSelect }: DrivePickerProps) {
  const [stack, setStack] = useState<string[]>([DEFAULT_FOLDER_ID]);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [videos, setVideos] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderId = stack[stack.length - 1];

  const load = async (folder: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/google/drive/browse?folderId=${folder}`);
    const data = (await res.json()) as DriveBrowseResponse;
    if (!res.ok) {
      setError(data?.error ?? "Unable to load Drive");
      setLoading(false);
      return;
    }
    setFolders(data.folders ?? []);
    setVideos(data.videos ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load(folderId);
  }, [folderId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">Current folder: {folderId}</div>
        {stack.length > 1 && (
          <button
            className="text-sm text-zinc-700 underline"
            onClick={() => setStack((prev) => prev.slice(0, -1))}
          >
            Back
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading Drive...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-2">
          {folders.length === 0 && videos.length === 0 && (
            <p className="text-sm text-zinc-500">No videos or folders here.</p>
          )}

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setStack((prev) => [...prev, folder.id])}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-zinc-50"
            >
              <span>📁 {folder.name}</span>
              <span className="text-xs text-zinc-500">Open</span>
            </button>
          ))}

          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelect(video)}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-zinc-50"
            >
              <span>🎥 {video.name}</span>
              <span className="text-xs text-zinc-500">Select</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
