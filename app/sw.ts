import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScopeEventMap & {
  __SW_MANIFEST: any;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
