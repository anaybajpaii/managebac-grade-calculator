export function classIdFromUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = pathname.match(/\/classes\/(\d+)(?:\/|$)/);
  return match?.[1] ?? null;
}
