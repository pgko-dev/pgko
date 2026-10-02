import { RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { UserRules } from "@pgko-dev/config";
import { tConfirmPasswordSchema, tOtpSchema, tRegisterPasswordSchema } from "@pgko-dev/schema";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useRequestPasswordReset } from "@/hooks/mutation/use-request-password-reset";
import { useResetPassword } from "@/hooks/mutation/use-reset-password";
import { useAuthForm } from "@/integrations/form/auth-form.ts";

import { OTP_LENGTH, STEP2_FORM_ID } from "./-forgot-constants";

const RESEND_COOLDOWN_SECONDS = 60;

function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s: number) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const restart = () => setSecondsLeft(RESEND_COOLDOWN_SECONDS);

  return { secondsLeft, isCoolingDown: secondsLeft > 0, restart };
}

export function Step2({
  email,
  isPending,
  mutateAsync: resetAsync,
  onSuccess,
}: Readonly<{
  email: string;
  isPending: boolean;
  mutateAsync: ReturnType<typeof useResetPassword>["mutateAsync"];
  onSuccess: () => void;
}>) {
  const { t } = useTranslation();
  const otpInputId = useId();
  const { mutateAsync: resendAsync, isPending: isResending } = useRequestPasswordReset();
  const { secondsLeft, isCoolingDown, restart: restartCooldown } = useResendCooldown();

  const handleResend = async () => {
    await resendAsync({ email });
    restartCooldown();
  };

  const schemas = useMemo(
    () => ({
      otp: tOtpSchema(t),
      password: tRegisterPasswordSchema(t),
      confirmPassword: tConfirmPasswordSchema(t),
    }),
    [t],
  );

  const form = useAuthForm({
    formId: STEP2_FORM_ID,
    defaultValues: {
      otp: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      await resetAsync({ email, otp: value.otp, password: value.password });
      onSuccess();
    },
  });

  let resendText = t("ui.forgotPassword.action.resend");
  if (isResending) {
    resendText = t("ui.forgotPassword.action.sendingCode");
  } else if (isCoolingDown) {
    resendText = t("ui.forgotPassword.action.resendCooldown", { seconds: secondsLeft });
  }

  return (
    <CardContent>
      <form
        noValidate
        id={form.formId}
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <FieldGroup>
          <FieldSet className="gap-2" disabled={isPending}>
            <Field>
              <Label htmlFor={otpInputId}>{t("ui.field.label.otp")}</Label>
              <form.AppField
                name="otp"
                validators={{
                  onChange: schemas.otp,
                }}
              >
                {(field) => (
                  <InputOTP
                    id={otpInputId}
                    maxLength={OTP_LENGTH}
                    value={field.state.value}
                    onChange={(val) => field.handleChange(val)}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: OTP_LENGTH }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                )}
              </form.AppField>
              <div className="mt-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto gap-1.5 p-0 text-xs"
                  disabled={isResending || isCoolingDown}
                  onClick={handleResend}
                >
                  {isResending ? <Spinner className="size-3" /> : <RotateCcw className="size-3" />}
                  {resendText}
                </Button>
              </div>
            </Field>

            <form.AppField
              name="password"
              validators={{
                onChange: schemas.password,
              }}
            >
              {(field) => (
                <field.PasswordField
                  {...UserRules.password}
                  autoComplete="new-password"
                  label={t("ui.field.label.password")}
                />
              )}
            </form.AppField>

            <form.AppField
              name="confirmPassword"
              validators={{
                onChangeListenTo: ["password"],
                onChange: ({ value, fieldApi }) => {
                  const errors = fieldApi.parseValueWithSchema(schemas.confirmPassword);
                  if (errors) return errors;

                  if (value !== fieldApi.form.getFieldValue("password")) {
                    return { message: t("vali.confirmPassword.notMatch") };
                  }
                },
              }}
            >
              {(field) => (
                <field.PasswordField
                  {...UserRules.password}
                  autoComplete="new-password"
                  confirmPassword
                  label={t("ui.field.label.confirmPassword")}
                />
              )}
            </form.AppField>
          </FieldSet>
        </FieldGroup>
      </form>
    </CardContent>
  );
}
