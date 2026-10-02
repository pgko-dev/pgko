import { createFormHook } from "@tanstack/react-form";

import { CheckboxField } from "@/components/fields/checkbox-field.tsx";
import { InputField } from "@/components/fields/input-field.tsx";
import { PasswordField } from "@/components/fields/password-field.tsx";

import { fieldContext, formContext } from "./form-context.ts";

export const { useAppForm: useAuthForm } = createFormHook({
  fieldComponents: {
    InputField,
    PasswordField,
    CheckboxField,
  },
  formComponents: {},
  fieldContext,
  formContext,
});
