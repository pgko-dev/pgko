import type React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { useFieldContext } from "@/integrations/form/form-context.ts";

export function CheckboxField({
  // main
  label,
  description: _description,
  // input
  required: _required,
  className: _className,
  ...rest
}: {
  label?: React.ReactNode;
  description?: React.ReactNode;
} & Omit<
  React.ComponentProps<typeof Checkbox>,
  "id" | "name" | "checked" | "onCheckedChange" | "aria-invalid"
>) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldSet>
      <FieldGroup data-slot="checkbox-group">
        <Field orientation="horizontal" data-invalid={isInvalid}>
          <Checkbox
            id={field.name}
            name={field.name}
            checked={field.state.value}
            onCheckedChange={(checked) => field.handleChange(checked)}
            {...rest}
          />
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        </Field>
      </FieldGroup>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </FieldSet>
  );
}
