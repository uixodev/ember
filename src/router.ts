import { useEffect, useState } from 'react';

/** Tiny hash router, so the static build works on any host. Routes look like "/area/abc". */
export function currentPath(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string, opts?: { replace?: boolean }): void {
  if (opts?.replace) location.replace(`#${path}`);
  else location.hash = path;
}

export function back(fallback = '/'): void {
  if (history.length > 1) history.back();
  else navigate(fallback, { replace: true });
}

const savedScroll = new Map<string, number>();
const pathOf = (url: string) => (url.split('#')[1] || '/');

/** Where you were on a page when you left it. Only the tab pages use this when you come back. */
export const scrollFor = (path: string): number => savedScroll.get(path) ?? 0;

export function usePath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = (e: HashChangeEvent) => {
      savedScroll.set(pathOf(e.oldURL), window.scrollY);
      setPath(currentPath());
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
