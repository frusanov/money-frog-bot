declare module "telegraf" {
  interface Context {
    _preparedMessage: Message;
    updatePreparedMessage: (text: string) => Promise<void>;
  }
}

import type { Context, MiddlewareFn } from "telegraf";
import { message } from "telegraf/filters";
import type { Message } from "telegraf/types";
import { getErrorReporter } from "../../utils/error-reporter";

export const preparedResponseMiddleware: MiddlewareFn<Context> = async (
  ctx,
  next
) => {
  await ctx.persistentChatAction("typing", async () => {
    if (!ctx.has(message())) {
      throw new Error("Message not found");
    }

    ctx._preparedMessage = await ctx.reply("⌛", {
      reply_parameters: { message_id: ctx.message.message_id },
    });

    ctx.updatePreparedMessage = async (text: string) => {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx._preparedMessage.message_id,
        undefined,
        text
      );
    };

    try {
      return await next();
    } catch (e) {
      console.error("Error in prepared response middleware:", e);

      // Report error to monitoring channel
      const errorReporter = getErrorReporter();
      if (errorReporter) {
        try {
          await errorReporter.reportError(e as Error, {
            userId: ctx.message?.from?.id?.toString(),
            username: ctx.message?.from?.username,
            messageText: ctx.has(message("text"))
              ? ctx.message.text
              : undefined,
            updateId: ctx.update.update_id,
          });
        } catch (reportError) {
          console.error(
            "Failed to report prepared response error:",
            reportError
          );
        }
      }

      const hasMessage = e instanceof Error && e.message;

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          ctx._preparedMessage.message_id,
          undefined,
          hasMessage ? `Error: ${e.message}` : `Error: Unknown error`
        );
      } catch (editError) {
        console.error("Failed to edit error message:", editError);
        // Fallback: try to send a new error message
        try {
          await ctx.reply(
            "❌ An error occurred while processing your message."
          );
        } catch (replyError) {
          console.error("Failed to send fallback error message:", replyError);
        }
      }
    }
  });
};
