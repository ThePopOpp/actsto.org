/**
 * The chosen design variant, as an external store.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the choice lives in
 * localStorage, which the server can't see. Reading it in an effect would mean a
 * setState during mount (and a visible flash); reading it in a lazy initialiser
 * would hydrate-mismatch. A store with separate client and server snapshots is
 * the shape React actually provides for this.
 *
 * The `storage` listener means two open dashboard tabs stay in agreement.
 */

import {
  DEFAULT_VARIANT_ID,
  VARIANT_STORAGE_KEY,
  getVariant,
  type MarketingVariantId,
} from "@/lib/marketing/design-variants";

let cached: MarketingVariantId | null = null;
const listeners = new Set<() => void>();

function read(): MarketingVariantId {
  try {
    return getVariant(window.localStorage.getItem(VARIANT_STORAGE_KEY)).id;
  } catch {
    return DEFAULT_VARIANT_ID;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeVariant(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== VARIANT_STORAGE_KEY) return;
    cached = null;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Must return a stable reference between changes, hence the cache. */
export function getVariantSnapshot(): MarketingVariantId {
  if (cached === null) cached = read();
  return cached;
}

export function getVariantServerSnapshot(): MarketingVariantId {
  return DEFAULT_VARIANT_ID;
}

export function setVariantChoice(id: MarketingVariantId): void {
  cached = id;
  try {
    window.localStorage.setItem(VARIANT_STORAGE_KEY, id);
  } catch {
    /* private browsing — the choice just won't outlive the session */
  }
  emit();
}
