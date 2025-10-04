/// <reference lib="webworker" />

import type { PrecacheEntry } from "@serwist/precaching";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

export {};
