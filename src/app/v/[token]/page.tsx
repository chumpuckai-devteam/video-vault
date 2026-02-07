import Viewer from "./Viewer";

export default async function ViewerPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
        <Viewer token={params.token} />
      </div>
    </div>
  );
}
