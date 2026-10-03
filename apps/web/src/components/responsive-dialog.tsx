import { XIcon } from "lucide-react";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ResponsiveDialogContext = createContext<boolean | null>(null);

function useResponsiveDialog() {
  const isMobile = useContext(ResponsiveDialogContext);

  if (isMobile === null) {
    throw new Error("ResponsiveDialog parts must be used within a ResponsiveDialog.");
  }

  return isMobile;
}

interface ResponsiveDialogProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible?: boolean;
}

/** Uses a bottom drawer below 768px and a centered dialog on larger screens. */
function ResponsiveDialog({
  children,
  open,
  onOpenChange,
  dismissible = true,
}: Readonly<ResponsiveDialogProps>) {
  const isMobile = useIsMobile();

  const handleOpenChange = (nextOpen: boolean, details: { cancel: () => void }) => {
    if (!nextOpen && !dismissible) {
      details.cancel();
      return;
    }

    onOpenChange(nextOpen);
  };

  return (
    <ResponsiveDialogContext.Provider value={isMobile}>
      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={handleOpenChange}
          disablePointerDismissal={!dismissible}
          showSwipeHandle={dismissible}
        >
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={!dismissible}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

interface ResponsiveDialogContentProps {
  children: ReactNode;
  showCloseButton?: boolean;
  dialogClassName?: string;
  drawerClassName?: string;
  initialFocus?: ComponentProps<typeof DialogContent>["initialFocus"];
}

function ResponsiveDialogContent({
  children,
  showCloseButton = true,
  dialogClassName,
  drawerClassName,
  initialFocus,
}: Readonly<ResponsiveDialogContentProps>) {
  const isMobile = useResponsiveDialog();

  if (!isMobile) {
    return (
      <DialogContent
        className={dialogClassName}
        showCloseButton={showCloseButton}
        initialFocus={initialFocus}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent className={drawerClassName} initialFocus={initialFocus}>
      {children}
      {showCloseButton && (
        <DrawerClose
          render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </DrawerClose>
      )}
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({ className, ...props }: ComponentProps<"div">) {
  const isMobile = useResponsiveDialog();

  return isMobile ? (
    <DrawerHeader
      className={cn(
        "min-h-0 shrink gap-2 overflow-y-auto overscroll-contain group-data-[swipe-axis=y]/drawer-popup:text-left",
        className,
      )}
      {...props}
    />
  ) : (
    <DialogHeader className={className} {...props} />
  );
}

function ResponsiveDialogFooter({ className, ...props }: ComponentProps<"div">) {
  const isMobile = useResponsiveDialog();

  return isMobile ? (
    <DrawerFooter
      className={cn(
        "mt-4 flex-col-reverse border-t bg-muted/50 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>button]:min-h-11 [&>button]:w-full",
        className,
      )}
      {...props}
    />
  ) : (
    <DialogFooter className={cn("flex-row gap-2 sm:justify-end", className)} {...props} />
  );
}

type ResponsiveDialogTitleProps = Omit<
  ComponentProps<typeof DialogTitle>,
  "className" | "render"
> & {
  className?: string;
};

function ResponsiveDialogTitle(props: Readonly<ResponsiveDialogTitleProps>) {
  const isMobile = useResponsiveDialog();

  return isMobile ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

type ResponsiveDialogDescriptionProps = Omit<
  ComponentProps<typeof DialogDescription>,
  "className" | "render"
> & { className?: string };

function ResponsiveDialogDescription(props: Readonly<ResponsiveDialogDescriptionProps>) {
  const isMobile = useResponsiveDialog();

  return isMobile ? <DrawerDescription {...props} /> : <DialogDescription {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
};
