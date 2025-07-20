import type { Telegraf } from "telegraf";

const ERROR_CHANNEL_ID = process.env.ERROR_CHANNEL_ID;

export class ErrorReporter {
  private bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;
  }

  async reportError(
    error: Error,
    context?: {
      userId?: string;
      username?: string;
      messageText?: string;
      updateId?: number;
    }
  ) {
    try {
      const timestamp = new Date().toISOString();
      const errorMessage = this.formatErrorMessage(error, context, timestamp);

      await this.bot.telegram.sendMessage(ERROR_CHANNEL_ID, errorMessage, {
        parse_mode: "HTML",
        // disable_web_page_preview: true,
      });

      console.log("Error reported to monitoring channel");
    } catch (reportError) {
      console.error(
        "Failed to report error to monitoring channel:",
        reportError
      );
      // Don't throw here to avoid cascading errors
    }
  }

  private formatErrorMessage(
    error: Error,
    context?: {
      userId?: string;
      username?: string;
      messageText?: string;
      updateId?: number;
    },
    timestamp?: string
  ): string {
    const lines: string[] = [];

    lines.push("🚨 <b>Bot Error Report</b>");
    lines.push("");

    if (timestamp) {
      lines.push(`⏰ <b>Time:</b> ${timestamp}`);
    }

    lines.push(
      `❌ <b>Error:</b> ${this.escapeHtml(error.message || "Unknown error")}`
    );

    if (context?.userId) {
      lines.push(`👤 <b>User ID:</b> <code>${context.userId}</code>`);
    }

    if (context?.username) {
      lines.push(`👤 <b>Username:</b> @${this.escapeHtml(context.username)}`);
    }

    if (context?.updateId) {
      lines.push(`🔢 <b>Update ID:</b> <code>${context.updateId}</code>`);
    }

    if (context?.messageText) {
      const truncatedText =
        context.messageText.length > 200
          ? context.messageText.substring(0, 200) + "..."
          : context.messageText;
      lines.push(
        `💬 <b>Message:</b> <code>${this.escapeHtml(truncatedText)}</code>`
      );
    }

    if (error.stack) {
      const truncatedStack =
        error.stack.length > 1000
          ? error.stack.substring(0, 1000) + "..."
          : error.stack;
      lines.push("");
      lines.push(`📋 <b>Stack Trace:</b>`);
      lines.push(`<pre>${this.escapeHtml(truncatedStack)}</pre>`);
    }

    return lines.join("\n");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  async reportInfo(message: string, details?: Record<string, any>) {
    try {
      const timestamp = new Date().toISOString();
      let infoMessage = `ℹ️ <b>Bot Info</b>\n\n⏰ <b>Time:</b> ${timestamp}\n📝 <b>Message:</b> ${this.escapeHtml(
        message
      )}`;

      if (details) {
        infoMessage += "\n\n📊 <b>Details:</b>";
        for (const [key, value] of Object.entries(details)) {
          infoMessage += `\n• <b>${this.escapeHtml(
            key
          )}:</b> <code>${this.escapeHtml(String(value))}</code>`;
        }
      }

      await this.bot.telegram.sendMessage(ERROR_CHANNEL_ID, infoMessage, {
        parse_mode: "HTML",
        // disable_web_page_preview: true,
      });

      console.log("Info reported to monitoring channel");
    } catch (reportError) {
      console.error(
        "Failed to report info to monitoring channel:",
        reportError
      );
    }
  }
}

// Singleton instance
let errorReporter: ErrorReporter | null = null;

export function initializeErrorReporter(bot: Telegraf): ErrorReporter {
  errorReporter = new ErrorReporter(bot);
  return errorReporter;
}

export function getErrorReporter(): ErrorReporter | null {
  return errorReporter;
}
