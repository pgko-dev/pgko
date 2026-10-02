import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AtSign, User, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { UserRules } from "@pgko-dev/config";
import {
  tConfirmPasswordSchema,
  tEmailSchema,
  tNameSchema,
  tRegisterPasswordSchema,
} from "@pgko-dev/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useRegister } from "@/hooks/mutation/use-register.ts";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAuthForm } from "@/integrations/form/auth-form.ts";
import { sitePageTitle } from "@/lib/site-title";

export const Route = createFileRoute("/_auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const { mutate, isPending } = useRegister();
  const { t } = useTranslation();
  useDocumentTitle(sitePageTitle(t("ui.register.title")));
  const authSearch = useSearch({ from: "/_auth" });

  const schemas = useMemo(
    () => ({
      email: tEmailSchema(t),
      name: tNameSchema(t),
      password: tRegisterPasswordSchema(t),
      confirmPassword: tConfirmPasswordSchema(t),
    }),
    [t],
  );

  const form = useAuthForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: ({ value }) => {
      mutate({
        name: value.name,
        email: value.email,
        password: value.password,
      });
    },
  });

  return (
    <div className="flex w-full max-w-105 flex-col gap-3">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("ui.register.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
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

                <form.AppField
                  name="name"
                  validators={{
                    onChange: schemas.name,
                  }}
                >
                  {(field) => (
                    <field.InputField
                      {...UserRules.name}
                      label={t("ui.field.label.name")}
                      inlineStart={<User />}
                    />
                  )}
                </form.AppField>

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
        <CardFooter className="mt-3 flex flex-col items-center justify-center">
          <Field>
            <Button form={form.formId} type="submit" disabled={isPending}>
              {isPending ? <Spinner /> : <UserPlus className="size-4" />}
              {isPending ? t("ui.register.action.registering") : t("ui.register.action.register")}
            </Button>
          </Field>
          <div className="mt-3 text-sm text-muted-foreground">
            {t("ui.register.hint.haveAccount")}{" "}
            <Link
              to="/login"
              search={authSearch}
              className="text-primary !no-underline hover:!underline"
            >
              {t("ui.register.hint.loginCta")}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
