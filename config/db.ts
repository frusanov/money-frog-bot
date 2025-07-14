import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { join } from "node:path";

export const pglite = new PGlite(join(__dirname, "../db"));
export const db = drizzle({ client: pglite });
