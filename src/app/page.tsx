export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <div className="max-w-xl space-y-4 rounded-xl bg-white p-6 text-center shadow">
        <h1 className="text-2xl font-semibold">Video Vault</h1>
        <p className="text-sm text-zinc-600">
          Controlled Google Drive video sharing with session-locked secure links.
        </p>
        <a
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-white"
        >
          Go to Admin Dashboard
        </a>
      </div>
    </div>
  );
}
