import { useSelector } from "@tanstack/react-store";
import { CircleCheck, CircleX, Save, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { UserRules } from "@pgko.dev/config";
import { type PrivateUser, tBioSchema, tNameSchema, tSlugSchema } from "@pgko.dev/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSlugCheck } from "@/hooks/mutation/use-slug-check.ts";
import { useUpdateProfile } from "@/hooks/mutation/use-update-profile.ts";
import { useContentForm } from "@/integrations/form/content-form.ts";
import { cn } from "@/lib/utils";

export function ProfileSection({ user }: Readonly<{ user: PrivateUser }>) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useUpdateProfile();

  const [baseUrl] = useState(() =>
    window.location.origin.replace(/https?:\/\//, "").replace(/\/$/, ""),
  );

  const schemas = useMemo(
    () => ({
      name: tNameSchema(t),
      slug: tSlugSchema(t),
      bio: tBioSchema(t),
    }),
    [t],
  );

  const form = useContentForm({
    defaultValues: {
      name: user.name,
      slug: user.slug,
      bio: user.bio,
    },
    onSubmit: async ({ value }) => {
      await mutateAsync(value);
      form.reset(value);
    },
    onSubmitInvalid: (api) => {
      console.error(api.formApi.getAllErrors());
    },
  });

  const { mutateAsync: checkSlug } = useSlugCheck(user.slug);

  const isDefaultValue = useSelector(form.store, (state) => state.isDefaultValue);
  const slugFieldMeta = useSelector(form.store, (state) => state.fieldMeta.slug);
  let slugValidationIcon = <CircleX className="text-orange-600" />;
  if (slugFieldMeta?.isValidating) {
    slugValidationIcon = <Spinner className="text-muted-foreground" />;
  } else if (slugFieldMeta?.isValid) {
    slugValidationIcon = (
      <CircleCheck className={cn(!slugFieldMeta?.isDefaultValue && "text-emerald-600")} />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ui.settingsPage.profileSection.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          id={form.formId}
          onSubmit={async (e) => {
            e.preventDefault();
            await form.handleSubmit();
          }}
        >
          <FieldSet disabled={isPending}>
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
              name="slug"
              validators={{
                onChange: schemas.slug,
                onChangeAsyncDebounceMs: 300,
                onChangeAsync: async ({ value }) => {
                  const status = await checkSlug(value);
                  if (status === "taken") {
                    return t("ui.settingsPage.profileSection.slug.taken");
                  } else if (status === "error") {
                    return t("api.error.unknown");
                  }
                },
              }}
            >
              {(field) => (
                <field.InputField
                  className="-ml-0.5"
                  {...UserRules.slug}
                  label={t("ui.field.label.slug")}
                  inlineStart={
                    <>
                      {slugValidationIcon}
                      {baseUrl}/users/
                    </>
                  }
                />
              )}
            </form.AppField>

            <form.AppField
              name="bio"
              validators={{
                onChange: schemas.bio,
              }}
            >
              {(field) => (
                <field.TextareaField {...UserRules.bio} label={t("ui.field.label.bio")} />
              )}
            </form.AppField>
          </FieldSet>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          form={form.formId}
          type="submit"
          disabled={isDefaultValue || isPending || slugFieldMeta?.isValidating}
        >
          {isPending ? <Spinner /> : <Save className="size-4" />}
          {isPending
            ? t("ui.settingsPage.profileSection.action.submitting")
            : t("ui.settingsPage.profileSection.action.submit")}
        </Button>
      </CardFooter>
    </Card>
  );
}
