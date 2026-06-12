import Image from "next/image";
import Storefront from "@/components/Storefront";
import ClosedCountdown from "@/components/ClosedCountdown";
import { getProducts } from "@/lib/data";
import { toPublicProduct } from "@/lib/product";
import { STORE_CLOSED, REOPEN_AT } from "@/lib/storeStatus";

export const dynamic = "force-dynamic";

function ClosedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <Image
        src="/logo.png"
        alt="Snack Lab"
        width={120}
        height={120}
        priority
        className="logo-float"
      />
      <div className="flex flex-col items-center gap-5 text-center">
        <ClosedCountdown target={REOPEN_AT} />
        <p className="lab-label">LAST DAY OF SCHOOL · 06/26</p>
      </div>
    </main>
  );
}

export default async function StorePage() {
  if (STORE_CLOSED) {
    return <ClosedPage />;
  }
  const products = await getProducts();
  // Only ship public fields to the client — never cost / seller / stolenQty.
  return <Storefront initialProducts={products.map(toPublicProduct)} />;
}
