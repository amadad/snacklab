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
  feat: { label: "feat", cls: "lab-tag-accent" },
  fix: { label: "fix", cls: "lab-tag-hazard" },
  chore: { label: "chore", cls: "" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="lab-mono text-base font-bold uppercase tracking-[0.18em] text-ink">
            Snack<span className="text-reagent-deep">·</span>Lab
          </Link>
          <Link href="/" className="lab-label hover:text-ink transition-colors">
            ← Store
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <p className="lab-label mb-1">Build log</p>
        <h1 className="lab-mono text-3xl font-bold uppercase tracking-[0.06em] text-ink mb-2">Changelog</h1>
        <p className="text-muted mb-10 text-sm">What&apos;s been built, in order.</p>

        <div className="space-y-10">
          {changelog.map((entry) => (
            <div key={entry.date} className="flex gap-6">
              <div className="w-28 shrink-0 pt-0.5">
                <p className="lab-mono text-xs text-muted">{entry.date}</p>
                {entry.version && (
                  <p className="lab-mono text-xs font-bold text-ink mt-0.5">{entry.version}</p>
                )}
              </div>
              <div className="flex-1 border-l border-line pl-6">
                <ul className="space-y-2">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`lab-tag mt-0.5 shrink-0 ${badge[c.type].cls}`}>
                        {badge[c.type].label}
                      </span>
                      <span className="text-ink">{c.text}</span>
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
