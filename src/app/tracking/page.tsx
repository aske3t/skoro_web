type SearchParams = Promise<{ id?: string }>;

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { id } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Tracking</h1>
      {id ? (
        <p className="mt-4 text-white/80">
          Looking up shipment{" "}
          <span className="rounded bg-white/10 px-2 py-1 font-mono text-brand">
            {id}
          </span>
          …
        </p>
      ) : (
        <p className="mt-4 text-white/70">
          Enter a tracking number on the home page to see its status.
        </p>
      )}
    </div>
  );
}
