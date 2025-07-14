import { integer, jsonb, pgTable, uuid } from "drizzle-orm/pg-core";
import { db } from "../config/db";

export const contextsTable = pgTable("contexts", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull(),
  data: jsonb().notNull(),
});

export type ContextSelect = typeof contextsTable.$inferSelect;
export type ContextInsert = typeof contextsTable.$inferInsert;

export async function createContext(userId: string, data: any) {
  return await db.insert(contextsTable).values({ userId, data }).returning();
}
