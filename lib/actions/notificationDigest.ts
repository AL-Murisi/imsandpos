"use server";

import prisma from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

async function ensureDigestTable() {
  if (!ensurePromise) {
    ensurePromise = prisma
      .$executeRawUnsafe(
        `
      CREATE TABLE IF NOT EXISTS notification_digests (
        company_id text NOT NULL,
        digest_type text NOT NULL,
        sent_date date NOT NULL,
        digest_key text NOT NULL,
        last_sent_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (company_id, digest_type, sent_date, digest_key)
      );
    `,
      )
      .then(() => undefined)
      .catch((error) => {
        ensurePromise = null;
        throw error;
      });
  }
  return ensurePromise;
}

// 🔥 FIXED: Single atomic operation — checks AND inserts in one query
export async function acquireNotificationDigestLock(
  companyId: string,
  digestType: string,
  digestKey: string,
): Promise<boolean> {
  try {
    await ensureDigestTable();

    // Use INSERT ... ON CONFLICT DO NOTHING with RETURNING to atomically claim the lock
    // If row already exists, returns empty → lock not acquired
    // If row is new, returns the row → lock acquired
    const result = await prisma.$queryRaw<Array<{ company_id: string }>>`
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
      RETURNING company_id
    `;

    // If RETURNING returns a row, we successfully inserted → we got the lock
    return result.length > 0;
  } catch (error) {
    console.error("Failed to acquire notification digest lock:", error);
    // Fail safe: don't send if we can't verify uniqueness
    return false;
  }
}
