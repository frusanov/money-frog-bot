import "dotenv/config";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { idGuardMiddleware } from "./utils/id-guard";
import { contextHandler, store } from "./utils/context-handler";

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.use(idGuardMiddleware);

bot.start((ctx) => ctx.reply("Welcome"));

bot.command("clear", (ctx) => {
  store.deleteMessages(ctx.message.from.id.toString());
  ctx.reply("Context erased!");
});

bot.on(message("text"), async (ctx) => {
  const userId = ctx.message.from.id;

  await ctx.persistentChatAction("typing", async () => {
    const response = await contextHandler(userId, ctx.text ?? "");
    ctx.reply(response);
  });
});

bot.on(message("photo"), async (ctx) => {
  const userId = ctx.message.from.id;

  const fileURLs = await Promise.all(
    ctx.message.photo.map((photo) => {
      return ctx.telegram.getFileLink(photo.file_id);
    })
  );

  await ctx.persistentChatAction("typing", async () => {
    const response = await contextHandler(userId, ctx.text ?? "", fileURLs);
    ctx.reply(response);
  });
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
