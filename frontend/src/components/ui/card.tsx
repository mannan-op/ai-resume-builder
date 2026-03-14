import * as React from "react";

interface DivProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: DivProps): React.JSX.Element {
  return (
    <div
      className={[
        "rounded-xl border bg-white text-slate-900 dark:bg-gray-900 dark:text-white shadow",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return (
    <div
      className={["p-6 pb-2", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return (
    <h3
      className={[
        "text-lg font-semibold leading-none tracking-tight",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return (
    <div
      className={["p-6 pt-2", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
