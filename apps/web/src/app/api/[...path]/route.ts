import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const accessCookie = "patch_access";
const refreshCookie = "patch_refresh";
const secure = process.env.NODE_ENV === "production";

type Session = { accessToken: string; refreshToken: string; user: unknown };
type RouteContext = { params: Promise<{ path: string[] }> };

function setSessionCookies(response: NextResponse, session: Session) {
  response.cookies.set(accessCookie, session.accessToken, {
    httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 15 * 60,
  });
  response.cookies.set(refreshCookie, session.refreshToken, {
    httpOnly: true, secure, sameSite: "strict", path: "/api", maxAge: 7 * 24 * 60 * 60,
  });
}

function clearSessionCookies(response: NextResponse) {
  for (const [name, path] of [[accessCookie, "/"], [refreshCookie, "/api"]] as const) {
    response.cookies.set(name, "", { httpOnly: true, secure, sameSite: "strict", path, maxAge: 0 });
  }
}

async function forward(path: string, request: NextRequest, token?: string, body?: BodyInit) {
  const target = new URL(`${backendUrl.replace(/\/$/, "")}/${path}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType || body) headers.set("content-type", contentType ?? "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(target, {
    method: request.method,
    headers,
    body: body ?? (request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()),
    cache: "no-store",
  });
}

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!path.length || path.some(part => part === "." || part === "..")) {
    return NextResponse.json({ message: "Invalid API path" }, { status: 400 });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ message: "Cross-origin request rejected" }, { status: 403 });
    }
  }

  try {
    if (endpoint === "auth/login" || endpoint === "auth/refresh") {
      const refreshToken = request.cookies.get(refreshCookie)?.value;
      if (endpoint === "auth/refresh" && !refreshToken) {
        return NextResponse.json({ message: "Session expired" }, { status: 401 });
      }
      const upstream = await forward(endpoint, request, undefined,
        endpoint === "auth/refresh" ? JSON.stringify({ refreshToken }) : await request.arrayBuffer());
      if (!upstream.ok) {
        return new NextResponse(upstream.body, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
      }
      const session = await upstream.json() as Session;
      const response = NextResponse.json(session.user);
      setSessionCookies(response, session);
      return response;
    }

    if (endpoint === "auth/logout") {
      let token = request.cookies.get(accessCookie)?.value;
      if (!token && request.cookies.get(refreshCookie)?.value) {
        const refreshed = await fetch(`${backendUrl.replace(/\/$/, "")}/auth/refresh`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken: request.cookies.get(refreshCookie)?.value }), cache: "no-store",
        }).catch(() => null);
        if (refreshed?.ok) token = ((await refreshed.json()) as Session).accessToken;
      }
      if (token) {
        const result = await forward(endpoint, request, token).catch(() => null);
        if (result?.status === 401 && request.cookies.get(refreshCookie)?.value) {
          const refreshed = await fetch(`${backendUrl.replace(/\/$/, "")}/auth/refresh`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ refreshToken: request.cookies.get(refreshCookie)?.value }), cache: "no-store",
          }).catch(() => null);
          if (refreshed?.ok) {
            const session = await refreshed.json() as Session;
            await forward(endpoint, request, session.accessToken).catch(() => undefined);
          }
        }
      }
      const response = new NextResponse(null, { status: 204 });
      clearSessionCookies(response);
      return response;
    }

    const upstream = await forward(endpoint, request, request.cookies.get(accessCookie)?.value);
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ message: "API is unavailable" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
