import type React from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { useFieldContext } from "@/integrations/form/form-context.ts";
import { cn } from "@/lib/utils";

export function TextareaField({
  // main
  label,
  description,
  pattern: _pattern,
  // addons
  inlineStart,
  inlineEnd,
  blockStart,
  blockEnd,
  // input
  required,
  className,
  ...rest
}: {
  label?: React.ReactNode;
  description?: React.ReactNode;
  pattern?: unknown;
  inlineStart?: React.ReactNode;
  inlineEnd?: React.ReactNode;
  blockStart?: React.ReactNode;
  blockEnd?: React.ReactNode;
} & Omit<
  React.ComponentProps<"textarea">,
  "id" | "name" | "value" | "onChange" | "onBlur" | "aria-invalid"
>) {
  const field = useFieldContext<string | number | readonly string[]>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} className="max-w-full">
      {label && (
        <FieldLabel htmlFor={field.name}>
          {label} {required && <span className="text-destructive">*</span>}
        </FieldLabel>
      )}
      <InputGroup>
        {inlineStart && <InputGroupAddon align="inline-start">{inlineStart}</InputGroupAddon>}
        {inlineEnd && <InputGroupAddon align="inline-end">{inlineEnd}</InputGroupAddon>}
        {blockStart && <InputGroupAddon align="block-start">{blockStart}</InputGroupAddon>}
        {blockEnd && <InputGroupAddon align="block-end">{blockEnd}</InputGroupAddon>}
        <InputGroupTextarea
          {...rest}
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          className={cn(className, "wrap-anywhere")}
        />
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
