import type { AdminClient } from "@/lib/supabase/admin";

export type QueryResult = { data: unknown; error: { code?: string; message: string } | null };
export type Call = [method: string, ...args: unknown[]];

const CHAIN_METHODS = ["select", "update", "insert", "upsert", "eq", "is", "not", "in", "order", "limit", "returns"];

/**
 * Подмена клиента Supabase для тестов: каждый запрос (`from`) получает следующий заготовленный
 * ответ, все вызовы цепочки записываются — по ним видно, какие условия ушли в запрос.
 */
export function fakeSupabase(results: QueryResult[]) {
  const queries: Call[][] = [];
  const from = (table: string) => {
    const calls: Call[] = [["from", table]];
    queries.push(calls);
    const result = results[queries.length - 1] ?? { data: null, error: { message: "unexpected query" } };
    const builder: Record<string, unknown> = {
      then: (resolve: (value: QueryResult) => unknown) => resolve(result),
      maybeSingle: async () => result,
      single: async () => result,
    };
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    return builder;
  };
  return { db: { from } as unknown as AdminClient, queries };
}

export const ok = (data: unknown): QueryResult => ({ data, error: null });
export const fail = (code?: string): QueryResult => ({ data: null, error: { code, message: "db error" } });

/** Аргументы первого вызова метода, например `update`. */
export const argsOf = (calls: Call[], method: string) => calls.find(([m]) => m === method)?.slice(1);

/** Был ли в цепочке вызов с такими аргументами, например `eq("status", "active")`. */
export const hasCall = (calls: Call[], ...expected: unknown[]) =>
  calls.some((call) => expected.every((value, i) => call[i] === value));
