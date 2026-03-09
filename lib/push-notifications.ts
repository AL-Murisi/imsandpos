import webpush from "web-push";
import prisma from "@/lib/prisma";

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
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return { total: 0, successful: 0, failed: 0 };
  }

  const targetRoles = (recipients.targetRoles ?? []).map(normalizeRole);
  const explicitUserIds = recipients.targetUserIds ?? [];
  const roleUserIds = await resolveTargetUserIds(recipients.companyId, targetRoles);
  const targetUserIds = Array.from(new Set([...explicitUserIds, ...roleUserIds]));

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      company_id: recipients.companyId,
      ...(targetUserIds.length > 0
        ? {
            OR: [
              { userId: { in: targetUserIds } },
              ...(targetRoles.length > 0 ? [{ role: { in: targetRoles } }] : []),
            ],
          }
        : targetRoles.length > 0
          ? { role: { in: targetRoles } }
          : {}),
    },
  });

  const deduped = Array.from(
    new Map(subscriptions.map((sub) => [sub.endpoint, sub])).values(),
  );
  if (deduped.length === 0) {
    return { total: 0, successful: 0, failed: 0 };
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    data: {
      url: message.url ?? "/",
      sound: "/sound/notification.wav",
    },
    tag: message.tag ?? "ims-notification",
  });

  const results = await Promise.all(
    deduped.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
        return true;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        }
        return false;
      }
    }),
  );

  const successful = results.filter(Boolean).length;
  return {
    total: deduped.length,
    successful,
    failed: deduped.length - successful,
  };
}
