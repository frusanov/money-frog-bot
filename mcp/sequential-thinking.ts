import { mcp } from "@llamaindex/tools";

export const sequentialThinkingMCP = mcp({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
});
