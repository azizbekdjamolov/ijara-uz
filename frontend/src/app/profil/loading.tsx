export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-12 h-12 border-3 border-gold border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted">Yuklanmoqda...</p>
    </div>
  );
}
