"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setCurrency(key: string) {
  (await cookies()).set("NEXT_CURRENCY", key, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Optional: revalidate so UI updates
  revalidatePath("/");
}
