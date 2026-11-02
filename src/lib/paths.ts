export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes a path for plain <a>/<form> URLs, which Next.js doesn't prefix with basePath itself. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
