export const UserRules = {
  email: {
    maxLength: 254,
    minLength: 1,
    type: "email",
    inputMode: "email",
    autoComplete: "email",
  },
  password: {
    maxLength: 128,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
  },
  name: {
    minLength: 3,
    maxLength: 30,
    inputMode: "text",
    autoComplete: "name",
    pattern: /^(?!.*[,\uFF0C\u060C]).*$/,
  },
  slug: {
    minLength: 3,
    maxLength: 18,
    autoComplete: "off",
    autoCapitalize: "none",
    autoCorrect: "off",
    spellCheck: false,
    /** Lowercase letters, numbers, hyphens only; no leading/trailing hyphen. */
    pattern: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
  },
  bio: {
    minLength: 0,
    maxLength: 512,
  },
  role: {
    values: ["user", "admin"],
  },
  avatar: {
    maxFileBytes: 10 * 1024 * 1024,
    maxPixelSize: 150,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] as string[],
  },
} as const;
