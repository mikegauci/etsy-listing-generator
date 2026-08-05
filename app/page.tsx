import { Suspense } from "react";
import { GenerateForm } from "@/components/GenerateForm";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <GenerateForm />
    </Suspense>
  );
}
