import type { NextRequest } from "next/server";

const forwardedHeaders = ["content-type", "cookie", "accept"] as const;

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "El backend no está configurado." }, { status: 503 });
  }
  const { path } = await params;
  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, backendUrl);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const header of forwardedHeaders) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const method = request.method;
  const response = await fetch(target, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });
  const responseHeaders = new Headers();
  for (const header of ["content-type", "content-disposition", "cache-control", "x-content-type-options"]) {
    const value = response.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
