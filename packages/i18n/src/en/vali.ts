import type { Widen } from "../utils.js";

export const vali = {
  image: {
    invalidContent: "The image is invalid or unsupported. Please choose another image.",
  },
  bio: {
    invalid: "Enter a valid bio.",
    maxLength: "Bio must be {{max}} characters or fewer.",
  },
  name: {
    required: "Enter your nickname.",
    invalid: "Enter a valid nickname.",
    minLength: "Nickname must be at least {{min}} characters.",
    maxLength: "Nickname must be {{max}} characters or fewer.",
    patternMismatch: "Nickname cannot contain commas or similar punctuation (for example: , ， ،).",
  },
  email: {
    required: "Enter your email address.",
    invalid: "Enter a valid email address.",
    maxLength: "Email must be {{max}} characters or fewer.",
  },
  password: {
    required: "Enter a password.",
    invalid: "Enter a valid password.",
    minLength: "Password must be at least {{min}} characters.",
    maxLength: "Password must be {{max}} characters or fewer.",
    patternMismatch:
      "Password must include at least one lowercase letter, one uppercase letter, and one number.",
  },
  confirmPassword: {
    notMatch: "Passwords don't match. Please confirm your password.",
  },
  otp: {
    required: "Enter the verification code.",
    invalid: "Enter a valid 6-digit verification code.",
  },
  slug: {
    required: "Enter a username.",
    invalid: "Enter a valid username.",
    minLength: "Username must be at least {{min}} characters.",
    maxLength: "Username must be {{max}} characters or fewer.",
    patternMismatch:
      "Username must start and end with a letter or number, and may only contain lowercase letters (a–z), numbers (0–9), and hyphens (-) in between.",
  },
  bundle: {
    title: {
      required: "Enter a title.",
      invalid: "Enter a valid title.",
      maxLength: "Title must be {{max}} characters or fewer.",
    },
    artist: {
      required: "Enter an artist.",
      invalid: "Enter a valid artist name.",
      maxLength: "Artist name must be {{max}} characters or fewer.",
    },
    description: {
      invalid: "Enter a valid description.",
      maxLength: "Description must be {{max}} characters or fewer.",
    },
    tags: {
      maxLength: "You can add up to {{max}} tags.",
    },
    tag: {
      invalid: "Enter a valid tag.",
      minLength: "Tag must be at least {{min}} characters.",
      maxLength: "Tag must be {{max}} characters or fewer.",
      pattern: "Tag can only contain lowercase letters (a–z), numbers (0–9), and spaces.",
    },
    videoUrl: {
      invalid: "Enter a valid video URL.",
      maxLength: "Video URL must be {{max}} characters or fewer.",
    },
  },
} as const;

export type ValiTranslation = Widen<typeof vali>;
