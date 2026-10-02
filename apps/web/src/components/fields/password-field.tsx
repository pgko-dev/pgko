import { useToggle } from "@mantine/hooks";
import { EyeIcon, EyeOffIcon, SquareAsterisk, SquareCheck } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { InputField } from "./input-field.tsx";
import "./password-field.module.css";

export function PasswordField({
  confirmPassword,
  className,
  ...rest
}: { confirmPassword?: boolean } & Readonly<
  Omit<React.ComponentProps<typeof InputField>, "inlineStart" | "inlineEnd" | "type">
>) {
  const [showPassword, toggleShowPassword] = useToggle([false, true]);

  return (
    <InputField
      {...rest}
      className={cn(className, "hide-password-toggle")}
      type={showPassword ? "text" : "password"}
      inlineStart={confirmPassword ? <SquareCheck /> : <SquareAsterisk />}
      inlineEnd={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={() => toggleShowPassword()}
        >
          {showPassword ? <EyeIcon aria-hidden="true" /> : <EyeOffIcon aria-hidden="true" />}
        </Button>
      }
    />
  );
}
