import * as v from "valibot";

import { dateFrom } from "../primitives.js";
import {
  BioSchema,
  EmailSchema,
  LoginPasswordSchema,
  NameSchema,
  OtpSchema,
  RegisterPasswordSchema,
  SlugSchema,
} from "../schemas/user.js";

import { PrivateUserSchema } from "./user.js";

export const SessionUserSchema = v.object({
  sessionId: v.number(),
  sessionTokenHash: v.string(),
  expiresAt: dateFrom(),
  user: PrivateUserSchema,
});
export type SessionUser = v.InferOutput<typeof SessionUserSchema>;

export const SignUpBodySchema = v.object({
  name: NameSchema,
  email: EmailSchema,
  password: RegisterPasswordSchema,
});
export type SignUpBody = v.InferOutput<typeof SignUpBodySchema>;

export const SignInBodySchema = v.object({
  email: EmailSchema,
  password: LoginPasswordSchema,
});
export type SignInBody = v.InferOutput<typeof SignInBodySchema>;

export const RequestPasswordResetBodySchema = v.object({
  email: EmailSchema,
});

export const ResetPasswordBodySchema = v.object({
  email: EmailSchema,
  otp: OtpSchema,
  password: RegisterPasswordSchema,
});

export const UpdateProfileBodySchema = v.object({
  name: v.optional(NameSchema),
  bio: v.optional(BioSchema),
  slug: v.optional(SlugSchema),
});
export type UpdateProfileBody = v.InferOutput<typeof UpdateProfileBodySchema>;

export const AuthMeResponseSchema = v.object({
  user: v.nullable(PrivateUserSchema),
});

export type AuthMeResponse = v.InferOutput<typeof AuthMeResponseSchema>;
