import Link from "next/link";

type Entry = {
  date: string;
  version?: string;
  changes: { type: "feat" | "fix" | "chore"; text: string }[];
};

const changelog: Entry[] = [
  {
    date: "2026-03-17",
    changes: [
      { type: "feat", text: "Multiple owner codes (OWNER_CODES env var)" },
      { type: "fix", text: "TypeScript env cast fix for Cloudflare Workers build" },
    ],
  },
  {
    date: "2026-03-16",
    changes: [
      { type: "feat", text: "Affiliate model — per-seller inventory, isolated dashboard views" },
      { type: "feat", text: "Platform fee (PLATFORM_FEE_PCT) with per-seller breakdown" },
      { type: "feat", text: "Owner vs seller roles — owners see everything, sellers see their own" },
      { type: "feat", text: "Session endpoint (/api/session) for client role awareness" },
    ],
  },
  {
    date: "2026-03-15",
    changes: [
      { type: "feat", text: "Cancel orders with inventory restock" },
      { type: "feat", text: "Reconcile delivered quantities on complete" },
      { type: "feat", text: "Hot flag for featured products" },
      { type: "feat", text: "Profit tracker and 7-day sales chart on dashboard" },
      { type: "feat", text: "Item request form for customers" },
      { type: "feat", text: "Sold-out state — greyed out with badge, disabled add-to-cart" },
      { type: "feat", text: "Inventory quantity cap in cart and server-side stock check at order time" },
      { type: "feat", text: "Fulfillment method selection (pickup, delivery, ship)" },
      { type: "feat", text: "Auth hardening + Cloudflare deploy fixes" },
      { type: "chore", text: "Initial repo setup — Next.js + OpenNext/Cloudflare Workers" },
    ],
  },
];

const badge: Record<Entry["changes"][0]["type"], { label: string; cls: string }> = {
  feat: { label: "feat", cls: "bg-pink-light text-pink-bold" },
  fix: { label: "fix", cls: "bg-mint/40 text-mint-bold" },
  chore: { label: "chore", cls: "bg-peach text-caramel" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
          🍫 SnackLab
        </Link>
        <Link href="/" className="text-pink-light hover:text-white transition-colors text-sm">
          Back to Store
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-chocolate mb-2">Changelog</h1>
        <p className="text-caramel mb-10 text-sm">What&apos;s been built, in order.</p>

        <div className="space-y-10">
          {changelog.map((entry) => (
            <div key={entry.date} className="flex gap-6">
              <div className="w-28 shrink-0 pt-0.5">
                <p className="text-xs font-mono text-caramel">{entry.date}</p>
                {entry.version && (
                  <p className="text-xs font-bold text-chocolate mt-0.5">{entry.version}</p>
                )}
              </div>
              <div className="flex-1 border-l-2 border-pink-light pl-6">
                <ul className="space-y-2">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 ${badge[c.type].cls}`}>
                        {badge[c.type].label}
                      </span>
                      <span className="text-chocolate">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
