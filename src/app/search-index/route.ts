import { searchIndex } from "@/lib/catalog";

// Built once at deploy and served from the CDN; the header fetches it on first search focus.
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchIndex);
}
