import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  mode: z.enum(["login", "register"]).default("login"),
});

/**
 * POST /auth/login — email + password auth against Supabase.
 * The web app signs in directly from the browser; this endpoint exists so other
 * clients (mobile shell, scripts) can obtain a JWT for the other API routes.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase belum diatur - aplikasi berjalan mode lokal" },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const sb = supabaseServerClient();
  if (!sb) return NextResponse.json({ error: "Supabase client gagal dibuat" }, { status: 500 });

  const { email, password, mode } = parsed.data;
  const { data, error } =
    mode === "login"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });

  if (error) {
    // Friendly error message untuk invalid credentials
    const friendlyMessage = error.message.toLowerCase().includes('invalid') || 
                           error.message.toLowerCase().includes('credentials') ||
                           error.message.toLowerCase().includes('password') ||
                           error.message.toLowerCase().includes('email')
      ? "Username atau password salah, coba lagi ya"
      : error.message;
    
    return NextResponse.json({ error: friendlyMessage }, { status: 401 });
  }

  return NextResponse.json({
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    access_token: data.session?.access_token ?? null,
    refresh_token: data.session?.refresh_token ?? null,
    expires_at: data.session?.expires_at ?? null,
  });
}
