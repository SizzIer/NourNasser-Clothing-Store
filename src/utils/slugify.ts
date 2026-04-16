/** Matches server slugify: URL-safe segment from a display category name. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Numeric product id from a cart line id like `12-xs-heather-grey`. */
export function baseProductIdFromLineId(lineId: string | number): string {
  const s = String(lineId);
  const first = s.split("-")[0] ?? "";
  return /^\d+$/.test(first) ? first : s;
}
