import "dotenv/config";

import { Telegraf } from "telegraf";
import { idGuardMiddleware } from "./middleware/id-guard";
import { aiMiddleware } from "./middleware/ai";
import { preparedResponseMiddleware } from "./middleware/prepared-response";
import { store } from "./utils/context-handler";
import {
  initializeErrorReporter,
  getErrorReporter,
} from "./utils/error-reporter";

const bot = new Telegraf(process.env.BOT_TOKEN as string);

// Initialize error reporter
const errorReporter = initializeErrorReporter(bot);

// Set to track processed update IDs to prevent duplicates
const processedUpdates = new Set<number>();

// Middleware to prevent duplicate update processing
bot.use((ctx, next) => {
  const updateId = ctx.update.update_id;

  if (processedUpdates.has(updateId)) {
    console.log(`Skipping duplicate update ${updateId}`);
    return; // Skip this update
  }

  processedUpdates.add(updateId);

  // Clean up old update IDs to prevent memory leaks
  // Keep only the last 1000 update IDs
  if (processedUpdates.size > 1000) {
    const updateIds = Array.from(processedUpdates);
    updateIds.slice(0, updateIds.length - 1000).forEach((id) => {
      processedUpdates.delete(id);
    });
  }

  return next();
});

bot.use(idGuardMiddleware);

bot.command("clear", (ctx) => {
  store.deleteMessages(ctx.message.from.id.toString());
  ctx.reply("Context erased!");
});

bot.command("test_error", async (ctx) => {
  try {
    await errorReporter.reportError(
      new Error("Test error from /test_error command"),
      {
        userId: ctx.message.from.id.toString(),
        username: ctx.message.from.username,
        messageText: ctx.message.text,
        updateId: ctx.update.update_id,
      }
    );
    ctx.reply("✅ Test error reported to monitoring channel");
  } catch (error) {
    console.error("Failed to send test error:", error);
    ctx.reply("❌ Failed to send test error");
  }
});

bot.use(preparedResponseMiddleware);
bot.use(aiMiddleware);

bot.start((ctx) => ctx.reply("Welcome"));

// bot.on(message("text"), async (ctx) => {
//   const userId = ctx.message.from.id;

//   await ctx.persistentChatAction("typing", async () => {
//     const response = await contextHandler(userId, ctx.text ?? "");
//     ctx.reply(response);
//   });
// });

// bot.on(message("audio"), async (ctx) => {
//   // ctx.me
// });

// bot.on(message("photo"), async (ctx) => {
//   const userId = ctx.message.from.id;

//   const fileURLs = await Promise.all(
//     ctx.message.photo.map((photo) => {
//       return ctx.telegram.getFileLink(photo.file_id);
//     })
//   );

//   await ctx.persistentChatAction("typing", async () => {
//     const response = await contextHandler(userId, ctx.text ?? "", fileURLs);
//     ctx.reply(response);
//   });
// });

// Configure bot launch with proper error handling
bot
  .launch({
    dropPendingUpdates: true, // This drops any pending updates when bot starts
  })
  .then(async () => {
    console.log("Bot started successfully");

    // Report bot startup to monitoring channel
    try {
      await errorReporter.reportInfo("Bot started successfully", {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      });
    } catch (error) {
      console.error("Failed to report bot startup:", error);
    }
  })
  .catch((error) => {
    console.error("Failed to start bot:", error);
    process.exit(1);
  });

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Handle uncaught errors to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  // Report uncaught exception
  const reporter = getErrorReporter();
  if (reporter) {
    reporter
      .reportError(error, {
        messageText: "Uncaught Exception - Bot may crash",
      })
      .catch(() => {
        // Ignore reporting errors here to prevent cascading failures
      });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);

  // Report unhandled rejection
  const reporter = getErrorReporter();
  if (reporter) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    reporter
      .reportError(error, {
        messageText: "Unhandled Promise Rejection",
      })
      .catch(() => {
        // Ignore reporting errors here to prevent cascading failures
      });
  }
});
