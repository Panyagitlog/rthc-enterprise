import { useCallback, useEffect } from "react";
import {
  Link as TanStackLink,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

type LinkProps = Omit<React.ComponentProps<typeof TanStackLink>, "to"> & {
  to: string;
};

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string, options?: { replace?: boolean }) =>
      router.navigate({ to: to as never, replace: options?.replace }),
    [router],
  );
}

export function useLocation() {
  return useRouterState({ select: (state) => state.location });
}

export function Link({ to, ...props }: LinkProps) {
  return <TanStackLink {...props} to={to as never} />;
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    void router.navigate({ to: to as never, replace });
  }, [router, to, replace]);

  return null;
}
