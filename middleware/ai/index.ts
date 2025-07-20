import type { Context, MiddlewareFn } from "telegraf";
import { message } from "telegraf/filters";
import { createDebug } from "../../utils/debug";
import { contextHandler } from "../../utils/context-handler";

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
      ctx.telegram.editMessageText(id, message_id, undefined, "Error");
      return next();
    }

    if (ctx.has(message("text"))) text = ctx.message.text;

    if (ctx.has(message("photo"))) {
      fileURLs = await Promise.all(
        ctx.message.photo.map((photo) => {
          return ctx.telegram.getFileLink(photo.file_id);
        })
      );
    }

    return contextHandler(ctx, text, fileURLs);
  } catch (e) {
    await ctx
      .updatePreparedMessage(
        `
      En error occured:

      ${(e as Error)?.message || "Unknown error"}

      ${(e as Error)?.stack || ""}
    `
      )
      .catch((e) => {
        console.error(e);
      });
  }
}) as MiddlewareFn<Context>;
