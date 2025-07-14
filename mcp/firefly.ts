import { mcp } from "@llamaindex/tools";

if (!process.env.FIREFLY_TOKEN)
  throw new Error("FIREFLY_TOKEN environment variable is not set");
if (!process.env.FIREFLY_BASE_URL)
  throw new Error("FIREFLY_BASE_URL environment variable is not set");

export const fireflyMCP = mcp({
  command: "npx",
  args: [
    "@firefly-iii-mcp/local",
    "--pat",
    process.env.FIREFLY_TOKEN as string,
    "--baseUrl",
    process.env.FIREFLY_BASE_URL as string,
    "--preset",
    "default",
  ],
});
