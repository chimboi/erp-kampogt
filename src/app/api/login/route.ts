import { NextResponse } from "next/server";
import { DEMO_USER, SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (
    (typeof username === "string" ? username.trim().toLowerCase() : "") !==
      DEMO_USER.username ||
    password !== DEMO_USER.password
  ) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
