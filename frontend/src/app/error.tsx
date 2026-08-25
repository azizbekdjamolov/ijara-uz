"use client";

import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-bold mb-2">Xatolik yuz berdi</h2>
      <p className="text-sm text-muted mb-6">
        {error.message || "Kutilmagan xatolik. Sahifani yangilab ko'ring."}
      </p>
      <button onClick={() => reset()} className="btn btn-primary px-6 py-2.5">
        Qayta urinish
      </button>
      <button
        onClick={() => router.push("/")}
        className="ml-2 btn btn-secondary px-6 py-2.5"
      >
        Bosh sahifa
      </button>
    </div>
  );
}
