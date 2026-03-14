import * as React from "react";

type ButtonVariant = "default" | "outline";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-60";
    const variantClass =
      variant === "outline"
        ? "border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
        : "bg-blue-600 text-white hover:bg-blue-500";

    return (
      <button
        ref={ref}
        type={type}
        className={[base, variantClass, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
