// Re-mounts on every navigation, giving each page a short fade instead of a hard cut.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
