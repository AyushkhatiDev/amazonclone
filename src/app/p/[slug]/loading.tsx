export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4" aria-busy="true" aria-label="Loading product">
      <div className="skeleton h-4 w-48 rounded" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_320px]">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-8 w-4/5 rounded-lg" />
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton mt-6 h-10 w-36 rounded-lg" />
          <div className="skeleton h-24 rounded-lg" />
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    </div>
  );
}
