import type { Context, MiddlewareFn } from "telegraf";
import { message } from "telegraf/filters";
import { createDebug } from "../../utils/debug";
import { contextHandler } from "../../utils/context-handler";
import { getErrorReporter } from "../../utils/error-reporter";

export const debug = createDebug("ai-middleware");

export const aiMiddleware: MiddlewareFn<Context> = (async (ctx, next) => {
  try {
    let text = "";
    let fileURLs: Array<URL> = [];

    if (!ctx.has(message())) {
      const {
        message_id,
        chat: { id },
      } = ctx._preparedMessage;
      await ctx.telegram.editMessageText(
        id,
        message_id,
        undefined,
        "Error: No message content"
      );
      return;
    }

    if (ctx.has(message("text"))) text = ctx.message.text;

    if (ctx.has(message("photo"))) {
      fileURLs = await Promise.all(
        ctx.message.photo.map((photo) => {
          return ctx.telegram.getFileLink(photo.file_id);
        })
      );
    }

    await contextHandler(ctx, text, fileURLs);
  } catch (e) {
    console.error("Error in AI middleware:", e);

    // Report error to monitoring channel
    const errorReporter = getErrorReporter();
    if (errorReporter) {
      try {
        await errorReporter.reportError(e as Error, {
          userId: ctx.message?.from?.id?.toString(),
          username: ctx.message?.from?.username,
          messageText: ctx.has(message("text")) ? ctx.message.text : undefined,
          updateId: ctx.update.update_id,
        });
      } catch (reportError) {
        console.error("Failed to report error:", reportError);
      }
    }

    try {
      await ctx.updatePreparedMessage(
        `An error occurred:

${(e as Error)?.message || "Unknown error"}

The bot will continue to work normally for new messages.`
      );
    } catch (updateError) {
      console.error("Failed to update error message:", updateError);
      // Fallback: try to send a simple error message
      try {
        await ctx.reply(
          "❌ An error occurred. Please try again with a new message."
        );
      } catch (replyError) {
        console.error("Failed to send error reply:", replyError);
      }
    }
  }
}) as MiddlewareFn<Context>;
