import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps, toast } from "sonner"

// Automatically deduplicate toasts by assigning a deterministic ID based on the message string.
// This prevents multiple identical toasts from stacking on screen when multiple listeners,
// queries, or rapid user actions trigger the same toast.
const patchToastMethod = (fn: any, type: string) => {
  return (message: any, options: any = {}) => {
    const id = options?.id || (typeof message === 'string' ? `${type}:${message}` : undefined);
    return fn(message, { id, ...options });
  };
};

if (!(toast as any).__isPatchedForDeduplication) {
  (toast as any).__isPatchedForDeduplication = true;
  toast.error = patchToastMethod(toast.error, 'error');
  toast.success = patchToastMethod(toast.success, 'success');
  toast.info = patchToastMethod(toast.info, 'info');
  toast.warning = patchToastMethod(toast.warning, 'warning');
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      visibleToasts={3}
      duration={4000}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster, toast }
