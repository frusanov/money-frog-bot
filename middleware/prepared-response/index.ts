declare module "telegraf" {
  interface Context {
    _preparedMessage: Message;
    updatePreparedMessage: (text: string) => Promise<void>;
  }
}

import type { Context, MiddlewareFn } from "telegraf";
import { message } from "telegraf/filters";
import type { Message } from "telegraf/types";

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
      const hasMessage = e instanceof Error && e.message;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx._preparedMessage.message_id,
        undefined,
        hasMessage ? `Error: ${e.message}` : `Error: Unknown error`
      );
    }
  });
};
