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
import { getErrorReporter } from "./error-reporter";

export const store = new SimpleChatStore();

export async function contextHandler(
  ctx: Context<Update.MessageUpdate>,
  text: string | undefined,
  files?: URL[]
) {
  const userId = ctx.message.from.id;

  try {
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
      try {
        if (agentToolCallEvent.include(event)) {
          debugData += `[Tool Call]: ${event.data.toolName}\n`;
          console.log(`Tool being called: ${event.data.toolName}`);
          await ctx.updatePreparedMessage(debugData).catch((err) => {
            console.error("Failed to update message during tool call:", err);
          });
        }

        // if (agentToolCallResultEvent.include(event)) {
        //   console.log(`Tool result: ${event.data.toolOutput}`);
        // }

        if (agentStreamEvent.include(event)) {
          response += event.data.delta;
        }
      } catch (eventError) {
        console.error("Error processing event:", eventError);
        // Continue processing other events
      }
    }

    store.addMessage(userId.toString(), {
      role: "assistant",
      content: response,
    });

    return await ctx.updatePreparedMessage(debugData + "\n\n" + response);
  } catch (error) {
    console.error("Error in context handler:", error);

    // Report error to monitoring channel
    const errorReporter = getErrorReporter();
    if (errorReporter) {
      try {
        await errorReporter.reportError(error as Error, {
          userId: userId.toString(),
          username: ctx.message?.from?.username,
          messageText: text,
          updateId: ctx.update.update_id,
        });
      } catch (reportError) {
        console.error("Failed to report context handler error:", reportError);
      }
    }

    // Try to save an error message to chat history
    try {
      store.addMessage(userId.toString(), {
        role: "assistant",
        content: "I encountered an error processing your message.",
      });
    } catch (storeError) {
      console.error("Failed to store error message:", storeError);
    }

    // Re-throw the error to be handled by the middleware
    throw error;
  }
}
