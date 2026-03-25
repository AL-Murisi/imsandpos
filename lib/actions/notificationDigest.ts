"use server";

import prisma from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

async function ensureDigestTable() {
  if (!ensurePromise) {
    ensurePromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notification_digests (
        company_id text NOT NULL,
        digest_type text NOT NULL,
        sent_date date NOT NULL,
        digest_key text NOT NULL,
        last_sent_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (company_id, digest_type, sent_date, digest_key)
      );
    `)
      .then(() => undefined)
      .catch((error) => {
        ensurePromise = null;
        throw error;
      });
  }

  return ensurePromise;
}

export async function shouldSendNotificationDigest(
  companyId: string,
  digestType: string,
  digestKey: string,
) {
  try {
    await ensureDigestTable();

    const rows = await prisma.$queryRaw<Array<{ inserted: number }>>`
      INSERT INTO notification_digests (
        company_id,
        digest_type,
        sent_date,
        digest_key,
        last_sent_at
      )
      VALUES (${companyId}, ${digestType}, CURRENT_DATE, ${digestKey}, now())
      ON CONFLICT (company_id, digest_type, sent_date, digest_key)
      DO NOTHING
      RETURNING 1 AS inserted
    `;

    return rows.length > 0;
  } catch (error) {
    console.error("Notification digest guard failed; sending anyway.", error);
    return true;
  }
}
