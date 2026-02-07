"use client";

import { useEffect, useState } from "react";

type ViewerState = {
  title: string | null;
};

export default function Viewer({ token }: { token: string }) {
  const [state, setState] = useState<ViewerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/viewer/resolve?token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to load video.");
        return;
      }
      setState({ title: data.video.title });
    };

    load();
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-lg bg-white p-6 text-center shadow">
        <h1 className="text-xl font-semibold">Access blocked</h1>
        <p className="mt-2 text-sm text-zinc-600">{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-xl rounded-lg bg-white p-6 text-center shadow">
        <p className="text-sm text-zinc-600">Loading video...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{state.title ?? "Secure Video"}</h1>
      <div
        className="overflow-hidden rounded-xl border border-zinc-200 bg-black"
        onContextMenu={(event) => event.preventDefault()}
      >
        <video
          src={`/api/stream/${token}`}
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          playsInline
          className="h-auto w-full"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Sharing and downloads are disabled. This link is locked to the first session that opens it.
      </p>
    </div>
  );
}
