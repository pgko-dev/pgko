import type React from "react";

export type ControlledFieldProps<T extends keyof React.JSX.IntrinsicElements> = Omit<
  React.ComponentProps<T>,
  "id" | "name" | "value" | "onChange" | "onBlur" | "aria-invalid"
>;
