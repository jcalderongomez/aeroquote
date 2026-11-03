import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function fetchBackend<T>(path: string): Promise<T> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) throw new Error("BACKEND_URL no está configurado.");

  const cookieHeader = (await cookies()).toString();
  const response = await fetch(new URL(path, backendUrl), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) {
    throw new Error(`El backend respondió ${response.status} al consultar ${path}.`);
  }
  return response.json() as Promise<T>;
}
