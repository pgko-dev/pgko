import { AtSign } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { UserRules } from "@pgko.dev/config";
import { tEmailSchema } from "@pgko.dev/schema";

import { CardContent } from "@/components/ui/card";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { useRequestPasswordReset } from "@/hooks/mutation/use-request-password-reset";
import { useAuthForm } from "@/integrations/form/auth-form.ts";

import { STEP1_FORM_ID } from "./-forgot-constants";

export function Step1({
  isPending,
  mutateAsync,
  onSuccess,
}: Readonly<{
  isPending: boolean;
  mutateAsync: ReturnType<typeof useRequestPasswordReset>["mutateAsync"];
  onSuccess: (email: string) => void;
}>) {
  const { t } = useTranslation();

  const schemas = useMemo(
    () => ({
      email: tEmailSchema(t),
    }),
    [t],
  );

  const form = useAuthForm({
    formId: STEP1_FORM_ID,
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({ email: value.email });
      onSuccess(value.email);
    },
  });

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
            <form.AppField
              name="email"
              validators={{
                onChange: schemas.email,
              }}
            >
              {(field) => (
                <field.InputField
                  {...UserRules.email}
                  label={t("ui.field.label.email")}
                  inlineStart={<AtSign />}
                />
              )}
            </form.AppField>
          </FieldSet>
        </FieldGroup>
      </form>
    </CardContent>
  );
}
