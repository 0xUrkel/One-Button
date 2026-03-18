import { readDb } from "@/lib/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return new Response("Missing wallet", { status: 400 });
  }

  const db = await readDb();
  const profile = db.profiles[wallet] ?? null;

  return Response.json(profile);
}
