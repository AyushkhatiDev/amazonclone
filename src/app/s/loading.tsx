export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6" aria-busy="true" aria-label="Loading results">
      <div className="skeleton h-8 w-56 rounded-lg" />
      <div className="skeleton mt-2 h-4 w-40 rounded" />
      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <div className="hidden space-y-3 md:block">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="skeleton h-5 rounded" style={{ width: `${60 + ((i * 17) % 35)}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square rounded-none" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-2/5 rounded" />
                <div className="skeleton h-6 w-1/2 rounded" />
                <div className="skeleton mt-3 h-9 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
