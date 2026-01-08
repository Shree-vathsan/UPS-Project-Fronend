import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  // Map the theme to what Sonner expects (night uses dark mode styling)
  const sonnerTheme = resolvedTheme === 'night' ? 'dark' : resolvedTheme

  return (
    <Sonner
      theme={sonnerTheme as ToasterProps["theme"]}
      className="toaster group"
      duration={6000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-green-100 group-[.toaster]:!border-green-400 group-[.toaster]:!text-green-800 dark:group-[.toaster]:!bg-green-900 dark:group-[.toaster]:!border-green-600 dark:group-[.toaster]:!text-green-100",
          error: "group-[.toaster]:!bg-red-100 group-[.toaster]:!border-red-400 group-[.toaster]:!text-red-800 dark:group-[.toaster]:!bg-red-900 dark:group-[.toaster]:!border-red-600 dark:group-[.toaster]:!text-red-100",
          warning: "group-[.toaster]:!bg-amber-100 group-[.toaster]:!border-amber-400 group-[.toaster]:!text-amber-800 dark:group-[.toaster]:!bg-amber-900 dark:group-[.toaster]:!border-amber-600 dark:group-[.toaster]:!text-amber-100",
          info: "group-[.toaster]:!bg-blue-100 group-[.toaster]:!border-blue-400 group-[.toaster]:!text-blue-800 dark:group-[.toaster]:!bg-blue-900 dark:group-[.toaster]:!border-blue-600 dark:group-[.toaster]:!text-blue-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
