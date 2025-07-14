import type { MiddlewareFn, Context } from "telegraf";
import { createDebug } from "../../utils/debug";

const debug = createDebug("id-guard-middleware");

const accessList = process.env.ACCESS_LIST?.split(",").map(Number);

export const idGuardMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id || !accessList || !accessList.includes(id)) {
    debug(`User with ID ${id} tried to access bot`);
    return ctx.reply("Invalid user ID");
  }

  return await next();
};
