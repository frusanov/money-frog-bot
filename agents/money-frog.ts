import { openai } from "@llamaindex/openai";
import { agent } from "@llamaindex/workflow";
import { fireflyMCP } from "../mcp/firefly";
import { sequentialThinkingMCP } from "../mcp/sequential-thinking";

export const moneyFrogAgent = agent({
  name: "Money Frog",
  description: "A helpful agent that can answer questions about money.",

  llm: openai({
    model: "gpt-4.1",
  }),

  // verbose: true,
  tools: [
    ...(await fireflyMCP.tools()),
    ...(await sequentialThinkingMCP.tools()),
  ],
});
