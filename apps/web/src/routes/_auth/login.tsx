import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AtSign, LogIn } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { UserRules } from "@pgko.dev/config";
import { tEmailSchema, tLoginPasswordSchema } from "@pgko.dev/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSignIn } from "@/hooks/mutation/use-sign-in.ts";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAuthForm } from "@/integrations/form/auth-form.ts";
import { sitePageTitle } from "@/lib/site-title";

export const Route = createFileRoute("/_auth/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const { mutate, isPending } = useSignIn();
  const { t } = useTranslation();
  useDocumentTitle(sitePageTitle(t("ui.login.title")));
  const authSearch = useSearch({ from: "/_auth" });

  const schemas = useMemo(
    () => ({
      email: tEmailSchema(t),
      password: tLoginPasswordSchema(t),
    }),
    [t],
  );

  const form = useAuthForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: ({ value }) => {
      mutate(value);
    },
    onSubmitInvalid: (api) => {
      console.error(api.formApi.getAllErrors());
    },
  });

  return (
    <div className="flex w-full max-w-105 flex-col gap-3">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("ui.login.title")}</CardTitle>
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
                  name="password"
                  validators={{
                    onChange: schemas.password,
                  }}
                >
                  {(field) => (
                    <field.PasswordField
                      {...UserRules.password}
                      label={t("ui.field.label.password")}
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
              {isPending ? <Spinner /> : <LogIn className="size-4" />}
              {isPending ? t("ui.login.action.signingIn") : t("ui.login.action.login")}
            </Button>
          </Field>
          <div className="mt-3 text-sm text-muted-foreground">
            {t("ui.login.hint.noAccount")}{" "}
            <Link
              to="/register"
              search={authSearch}
              className="text-primary !no-underline hover:!underline"
            >
              {t("ui.login.hint.registerCta")}
            </Link>
          </div>
          <div className="mt-2 text-sm">
            <Link
              to="/forgot-password"
              search={authSearch}
              className="text-primary !no-underline hover:!underline"
            >
              {t("ui.login.hint.forgotPassword")}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
