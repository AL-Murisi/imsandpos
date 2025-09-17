import { useEffect } from "react";

/**
 * A hook that debounces a side-effect (like calling an API or updating a URL).
 *
 * @param effect A function that runs after debounce delay.
 * @param deps Dependency array.
 * @param delay Debounce delay in milliseconds.
 */
export function useDebounceEffect(
  effect: () => void,
  deps: React.DependencyList,
  delay: number
): void {
  useEffect(() => {
    const handler = setTimeout(effect, delay);
    return () => clearTimeout(handler);
  }, deps);
}
