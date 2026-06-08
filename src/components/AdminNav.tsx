import Link from "next/link";
import Image from "next/image";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Crumb = { href: string; label: string };

/**
 * Shared admin chrome: logo + section path + nav links + sign-out.
 * `links` render as ghost crumbs; `current` is the active section label.
 */
export default function AdminNav({
  current,
  links = [],
}: {
  current: string;
  links?: Crumb[];
}) {
  return (
    <nav className="sticky top-0 z-40 border-b border-line-strong bg-ink text-paper">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-14">
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
          <Image src="/logo.png" alt="Snack Lab" width={120} height={118} className="h-8 w-auto" />
          <span className="lab-mono hidden truncate text-xs uppercase tracking-[0.14em] text-faint sm:inline">
            / {current}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="lab-label text-faint transition-colors hover:text-paper"
            >
              {l.label}
            </Link>
          ))}
          <AdminLogoutButton />
        </div>
      </div>
    </nav>
  );
}
