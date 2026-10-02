import * as v from "valibot";

export const integerFromString = v.pipe(v.string(), v.toNumber(), v.integer());

function trimEmptyEnvToUndefined(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return typeof value === "string" ? value.trim() : value;
}

export function envString<TSchema extends v.GenericSchema>(schema: TSchema) {
  return v.pipe(v.unknown(), v.transform(trimEmptyEnvToUndefined), schema);
}

export const envRequiredString = envString(v.pipe(v.string(), v.minLength(1)));
export const envLooseString = envString(v.optional(v.string()));
