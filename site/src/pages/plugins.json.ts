import { loadPlugins } from "../lib/plugins";

export const prerender = true;

export async function GET() {
  return new Response(JSON.stringify(loadPlugins()), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
