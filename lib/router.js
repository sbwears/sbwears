"use client";

// The UI was written against react-router-dom. This exposes the subset it uses on
// top of next/navigation so the page components could move over unchanged.

import { useEffect, useMemo } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export function useNavigate() {
  const router = useRouter();
  return useMemo(
    () =>
      function navigate(to, options = {}) {
        if (typeof to === "number") {
          if (to < 0) router.back();
          else router.forward();
          return;
        }
        if (options.replace) router.replace(to);
        else router.push(to);
      },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const query = searchParams?.toString();
  return useMemo(
    () => ({
      pathname,
      search: query ? `?${query}` : "",
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
    }),
    [pathname, query]
  );
}

export function useParams() {
  return useNextParams() ?? {};
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setSearchParams = (next) => {
    const params = new URLSearchParams(next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  return [searchParams, setSearchParams];
}

export function Link({ to, href, ...props }) {
  return <NextLink href={to ?? href} {...props} />;
}

export function Navigate({ to, replace = true }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}
