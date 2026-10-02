import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { AnimatePresence, LazyMotion, domMax } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useRequestPasswordReset } from "@/hooks/mutation/use-request-password-reset";
import { useResetPassword } from "@/hooks/mutation/use-reset-password";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { sitePageTitle } from "@/lib/site-title";

import { STEP1_FORM_ID, STEP2_FORM_ID } from "./-forgot-constants";
import { Step1 } from "./-forgot-step-1";
import { Step2 } from "./-forgot-step-2";

export const Route = createFileRoute("/_auth/forgot-password")({
  component: RouteComponent,
});

const fadeTransition = { type: "tween", duration: 0.3, ease: "easeInOut" } as const;

function RouteComponent() {
  const { t } = useTranslation();
  useDocumentTitle(sitePageTitle(t("ui.forgotPassword.title")));
  const navigate = useNavigate({ from: "/forgot-password" });
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const requestReset = useRequestPasswordReset();
  const resetPassword = useResetPassword();
  const isPending = step === 1 ? requestReset.isPending : resetPassword.isPending;
  const authSearch = useSearch({ from: "/_auth" });

  const handleResetSuccess = () => {
    toast.success(t("ui.forgotPassword.success"));
    void navigate({ to: "/login", search: authSearch });
  };

  const formId = step === 1 ? STEP1_FORM_ID : STEP2_FORM_ID;
  let buttonText: string;
  if (step === 1) {
    buttonText = isPending
      ? t("ui.forgotPassword.action.sendingCode")
      : t("ui.forgotPassword.action.sendCode");
  } else {
    buttonText = isPending
      ? t("ui.forgotPassword.action.submitting")
      : t("ui.forgotPassword.action.submit");
  }

  const goForward = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setStep(2);
  };

  const goBack = () => {
    setStep(1);
  };

  let submitIcon = step === 1 ? <Mail className="size-4" /> : <CheckCircle className="size-4" />;
  if (isPending) {
    submitIcon = <Spinner />;
  }

  return (
    <LazyMotion features={domMax} strict>
      <m.div layout className="w-full max-w-105" transition={{ layout: fadeTransition }}>
        <Card className="w-full overflow-hidden">
          <CardHeader>
            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-mt-1 mb-1 -ml-2 h-8 w-fit gap-1.5 text-muted-foreground"
                onClick={goBack}
              >
                <ArrowLeft className="size-4" />
                {t("ui.forgotPassword.action.back")}
              </Button>
            )}
            <CardTitle>{t("ui.forgotPassword.title")}</CardTitle>
          </CardHeader>
          <div className="relative">
            <AnimatePresence initial={false} mode="popLayout">
              <m.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fadeTransition}
              >
                {step === 1 ? (
                  <Step1
                    isPending={requestReset.isPending}
                    mutateAsync={requestReset.mutateAsync}
                    onSuccess={goForward}
                  />
                ) : (
                  <Step2
                    email={email}
                    isPending={resetPassword.isPending}
                    mutateAsync={resetPassword.mutateAsync}
                    onSuccess={handleResetSuccess}
                  />
                )}
              </m.div>
            </AnimatePresence>
          </div>
          <CardFooter className="mt-3 flex flex-col items-center justify-center">
            <Field>
              <Button form={formId} type="submit" disabled={isPending}>
                {submitIcon}
                {buttonText}
              </Button>
            </Field>
            <div className="mt-3 text-sm text-muted-foreground">
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="text-primary !no-underline hover:!underline"
              >
                {t("ui.forgotPassword.hint.backToLogin")}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </m.div>
    </LazyMotion>
  );
}
