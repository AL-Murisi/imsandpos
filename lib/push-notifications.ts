import prisma from "@/lib/prisma";
import { getFirebaseMessaging } from "@/lib/firebase/admin";
import {
  deletePushDeviceTokensByTokens,
  findPushDeviceTokens,
  type PushDeviceTokenRecord,
} from "@/lib/firebase/device-tokens";

type PushRecipientOptions = {
  companyId: string;
  targetUserIds?: string[];
  targetRoles?: string[];
};

type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function normalizeRole(role: string) {
  return role.trim().toLowerCase();
}

async function resolveTargetUserIds(companyId: string, roles: string[]) {
  if (roles.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      companyId,
      roles: {
        some: {
          role: {
            OR: roles.map((roleName) => ({
              name: {
                equals: roleName,
                mode: "insensitive",
              },
            })),
          },
        },
      },
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

export async function sendRoleBasedNotification(
  recipients: PushRecipientOptions,
  message: PushMessage,
) {
  const targetRoles = (recipients.targetRoles ?? []).map(normalizeRole);
  const explicitUserIds = recipients.targetUserIds ?? [];
  const roleUserIds = await resolveTargetUserIds(
    recipients.companyId,
    targetRoles,
  );
  const targetUserIds = Array.from(
    new Set([...explicitUserIds, ...roleUserIds]),
  );

  const deviceTokens = await findPushDeviceTokens(
    recipients.companyId,
    targetUserIds,
    targetRoles,
  );
  const dedupedDeviceTokens: PushDeviceTokenRecord[] = Array.from(
    new Map(deviceTokens.map((entry) => [entry.token, entry])).values(),
  );

  if (dedupedDeviceTokens.length === 0) {
    return { total: 0, successful: 0, failed: 0 };
  }

  let firebaseSuccessful = 0;
  const firebaseMessaging = getFirebaseMessaging();
  if (firebaseMessaging && dedupedDeviceTokens.length > 0) {
    const firebaseResult = await firebaseMessaging.sendEachForMulticast({
      tokens: dedupedDeviceTokens.map((entry) => entry.token),
      data: {
        title: message.title,
        body: message.body,
        url: message.url ?? "/",
        icon: "/web-app-manifest-192x192.png",
        badge: "/badge-72x72.png",
        tag: message.tag ?? "ims-notification",
      },
      webpush: {
        fcmOptions: {
          link: message.url ?? "/",
        },
        notification: {
          title: message.title,
          body: message.body,
          icon: "/web-app-manifest-192x192.png",
          badge: "/badge-72x72.png",
          tag: message.tag ?? "ims-notification",
        },
        headers: {
          Urgency: "high",
        },
      },
    });

    firebaseSuccessful = firebaseResult.successCount;
    const failedResponses = firebaseResult.responses.filter(
      (response) => !response.success,
    );
    if (failedResponses.length > 0) {
      console.error(
        "[Push] Firebase send failures:",
        failedResponses.map((response) => ({
          code: response.error?.code ?? "unknown",
          message: response.error?.message ?? "Unknown Firebase send error",
        })),
      );
    }

    const invalidTokens = firebaseResult.responses
      .map(
        (response, index): { response: typeof response; token?: string } => ({
          response,
          token: dedupedDeviceTokens[index]?.token,
        }),
      )
      .filter(({ response, token }) => {
        if (!token) return false;
        return (
          response.error?.code === "messaging/registration-token-not-registered"
        );
      })
      .map(({ token }) => token)
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      await deletePushDeviceTokensByTokens(invalidTokens);
    }
  }
  const total = dedupedDeviceTokens.length;
  const successful = firebaseSuccessful;

  return {
    total,
    successful,
    failed: total - successful,
  };
}
