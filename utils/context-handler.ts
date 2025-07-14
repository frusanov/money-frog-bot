import { SimpleChatStore, type MessageContentDetail } from "llamaindex";
import { moneyFrogAgent } from "../agents/money-frog";
import { getSystemPrompt } from "./get-system-prompt";
import {
  agentStreamEvent,
  agentToolCallEvent,
  agentToolCallResultEvent,
} from "@llamaindex/workflow";
import type { Context } from "telegraf";
import type { Message, Update } from "telegraf/types";

export const store = new SimpleChatStore();

export async function contextHandler(
  ctx: Context<Update.MessageUpdate>,
  text: string | undefined,
  files?: URL[]
) {
  const userId = ctx.message.from.id;

  store.addMessage(userId.toString(), {
    role: "user",
    content: [
      {
        type: "text",
        text: text ?? "",
      },
      ...(!!files && files.length > 0
        ? files.map(
            (file) =>
              ({
                type: "image_url",
                image_url: {
                  url: file.toString(),
                },
              } as MessageContentDetail)
          )
        : []),
    ],
  });

  const chatHistory = store.getMessages(userId.toString());
  const lastMessage = chatHistory.pop();

  let debugData = "";
  let response = "";

  const events = moneyFrogAgent.runStream(lastMessage?.content ?? "", {
    chatHistory: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      ...chatHistory,
    ],
  });

  for await (const event of events) {
    if (agentToolCallEvent.include(event)) {
      debugData += `[Tool Call]: ${event.data.toolName}\n`;
      console.log(`Tool being called: ${event.data.toolName}`);
      await ctx.updatePreparedMessage(debugData).catch();
    }

    // if (agentToolCallResultEvent.include(event)) {
    //   console.log(`Tool result: ${event.data.toolOutput}`);
    // }

    if (agentStreamEvent.include(event)) {
      response += event.data.delta;
    }
  }

  store.addMessage(userId.toString(), {
    role: "assistant",
    content: response,
  });

  return await ctx.updatePreparedMessage(debugData + "\n\n" + response);
}
