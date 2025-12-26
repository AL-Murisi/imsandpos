let globalSub: any = global as any;

if (!globalSub._pushSubscriptions) {
  globalSub._pushSubscriptions = [];
}

export const pushSubscriptions: PushSubscription[] =
  globalSub._pushSubscriptions;
