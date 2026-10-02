import { createFormHook } from "@tanstack/react-form";

import { InputField } from "@/components/fields/input-field.tsx";
import { TextareaField } from "@/components/fields/textarea-field.tsx";

import { fieldContext, formContext } from "./form-context.ts";

export const { useAppForm: useContentForm } = createFormHook({
  fieldComponents: {
    InputField,
    TextareaField,
  },
  formComponents: {},
  fieldContext,
  formContext,
});
