import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get() {}, set() {}, remove() {} } },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(
    requestUrl.searchParams.get("code")!,
  );

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/signup?error=auth`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/createcompanybyemail`);
}
