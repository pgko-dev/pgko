import * as v from "valibot";

// JSON + Elysia response validation: Date objects on the server, ISO strings on the client
export const dateFrom = () => v.pipe(v.union([v.date(), v.string()]), v.toDate());

// Query/env: strings on the wire; Elysia may already parse some as numbers
export const integerFrom = () =>
  v.pipe(v.union([v.string(), v.number()]), v.toNumber(), v.integer());

export const numberFrom = () => v.pipe(v.union([v.string(), v.number()]), v.toNumber());

export const booleanFrom = () => v.pipe(v.union([v.boolean(), v.string()]), v.toBoolean());

export const uuidString = () => v.pipe(v.string(), v.uuid());
export const urlString = () => v.pipe(v.string(), v.url());
