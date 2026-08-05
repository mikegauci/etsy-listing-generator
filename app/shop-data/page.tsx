import { Suspense } from "react";
import { ShopDataPanel } from "@/components/ShopDataPanel";

export default function ShopDataPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <ShopDataPanel />
    </Suspense>
  );
}
