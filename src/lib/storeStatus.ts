// Temporary kill switch for the whole storefront.
// While true: "/" renders the closed page, middleware redirects every other
// page to "/" and 503s all API routes. Flip to false to fully restore the site.
export const STORE_CLOSED = true;

// Last day of school — countdown target (midnight ET, June 26 2026).
export const REOPEN_AT = "2026-06-26T00:00:00-04:00";
