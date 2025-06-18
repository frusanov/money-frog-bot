import { openai } from "@llamaindex/openai";
import { agent } from "@llamaindex/workflow";
import { mcp } from "@llamaindex/tools";

const fireflyMCP = mcp({
  verbose: true,
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

export const moneyFrogAgent = agent({
  name: "Money Frog",
  description: "A helpful agent that can answer questions about money.",
  llm: openai({
    model: "gpt-4.1",
  }),
  verbose: true,
  tools: [...(await fireflyMCP.tools())],
});
