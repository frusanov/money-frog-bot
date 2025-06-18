import type { MiddlewareFn, Context } from "telegraf";

const accessList = process.env.ACCESS_LIST?.split(",").map(Number);

export const idGuardMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id || !accessList || !accessList.includes(id)) {
    return ctx.reply("Invalid user ID");
  }
  await next();
};
