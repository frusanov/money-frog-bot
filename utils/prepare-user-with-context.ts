import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { contextsTable, type ContextSelect } from "../tables/contexts.sql";
import { usersTable, type UserSelect } from "../tables/users.sql";

export type UserWithContext = Omit<UserSelect, "context"> & {
  context: Omit<ContextSelect, "userId"> | null;
};

export async function prepareUserWithContext(tgId: number) {
  let userWithContext: UserWithContext | null = null;

  userWithContext =
    (
      await db
        .select({
          id: usersTable.id,
          tgId: usersTable.tgId,
          context: {
            id: contextsTable.id,
            data: contextsTable.data,
          },
        })
        .from(usersTable)
        .leftJoin(contextsTable, eq(usersTable.context, contextsTable.id))
        .where(eq(usersTable.tgId, tgId))
    )[0] || null;

  if (!userWithContext) {
    userWithContext = await db
      .insert(usersTable)
      .values({ tgId })
      .returning()
      .then((rows) => {
        const user = rows[0] as UserSelect;

        return {
          context: null,
          id: user.id,
          tgId: user.tgId,
        };
      });
  }

  if (!userWithContext) throw new Error("User not found");

  if (!userWithContext?.context) {
    const context = await db
      .insert(contextsTable)
      .values({ userId: userWithContext.id, data: [] })
      .returning()
      .then((rows) => rows[0] as ContextSelect);

    userWithContext.context = context;
  }

  return userWithContext;
}
