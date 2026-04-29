import { enUS } from "./locales/en-US";

export type Locale = "zh-CN" | "en-US";

export const LOCALES = ["zh-CN", "en-US"] as const satisfies readonly Locale[];

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer Args) => infer Result
        ? (...args: Args) => Widen<Result>
        : T extends readonly [unknown, ...unknown[]]
          ? { [K in keyof T]: Widen<T[K]> }
          : T extends readonly (infer Item)[]
            ? readonly Widen<Item>[]
            : T extends object
              ? { [K in keyof T]: Widen<T[K]> }
              : T;

export type MessageDictionary = Widen<typeof enUS>;
