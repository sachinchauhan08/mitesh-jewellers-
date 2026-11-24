import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

type Executor = Pick<typeof db, "execute">;

export async function nextDocumentNumber(
  executor: Executor,
  docType: string,
  prefix: string,
): Promise<string> {
  const result = await executor.execute(sql`
    INSERT INTO document_counters (doc_type, prefix, next_number)
    VALUES (${docType}, ${prefix}, 2)
    ON CONFLICT (doc_type)
    DO UPDATE SET next_number = document_counters.next_number + 1
    RETURNING (next_number - 1) AS used_number, prefix
  `);
  const row = (result as unknown as { rows: { used_number: number; prefix: string }[] }).rows[0];
  const used = Number(row?.used_number ?? 1);
  return `${row?.prefix ?? prefix}-${String(used).padStart(4, "0")}`;
}
