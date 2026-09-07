import { useLayoutEffect, type RefObject } from "react";

export function useElementProperty<
  TElement extends HTMLElement,
  TKey extends keyof TElement,
>(ref: RefObject<TElement | null>, key: TKey, value: TElement[TKey]): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null) element[key] = value;
  }, [key, ref, value]);
}
