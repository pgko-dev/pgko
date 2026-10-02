export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly unknown[]
        ? readonly Widen<T[number]>[]
        : T extends object
          ? { [K in keyof T]: Widen<T[K]> }
          : T;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DotNestedKeys<T> = T extends Primitive
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends Primitive | readonly unknown[]
        ? K
        : DotNestedKeys<T[K]> extends infer D
          ? D extends string
            ? `${K}.${D}`
            : never
          : never;
    }[Extract<keyof T, string>];
