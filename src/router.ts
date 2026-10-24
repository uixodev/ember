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

export function usePath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
