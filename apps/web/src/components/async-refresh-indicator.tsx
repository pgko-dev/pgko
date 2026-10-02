import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 150;

export function AsyncRefreshIndicator({
  pending,
  label,
  className,
}: Readonly<{ pending: boolean; label: string; className?: string }>) {
  return (
    <span className={cn("ml-auto flex size-6 items-center justify-center", className)}>
      {pending ? <DelayedSpinner label={label} /> : null}
    </span>
  );
}

function DelayedSpinner({ label }: Readonly<{ label: string }>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return visible ? <Spinner aria-label={label} /> : null;
}
