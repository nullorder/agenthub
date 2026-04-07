import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const prerender = true;

export async function GET() {
  const marketplacePath = resolve(
    process.cwd(),
    "../.claude-plugin/marketplace.json",
  );
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf-8"));
  return new Response(JSON.stringify(marketplace.plugins || []), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
