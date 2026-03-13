import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

type FormProps<TFieldValues extends FieldValues> = {
  children: React.ReactNode;
} & UseFormReturn<TFieldValues>;

type FormFieldContextValue = {
  name: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined,
);

export function Form<TFieldValues extends FieldValues>({
  children,
  ...methods
}: FormProps<TFieldValues>): React.JSX.Element {
  return <FormProvider {...methods}>{children}</FormProvider>;
}

export function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormFieldContext.Provider value={{ name: String(props.name) }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={["space-y-2", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

function useFieldError(): string | undefined {
  const context = React.useContext(FormFieldContext);
  const { formState } = useFormContext();

  if (!context) {
    return undefined;
  }

  const error = formState.errors[context.name as keyof typeof formState.errors];
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : undefined;
}

export function FormLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return (
    <label
      className={["text-sm font-medium text-gray-200", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function FormControl({
  children,
}: {
  children: React.ReactElement;
}): React.JSX.Element {
  return children;
}

export function FormMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element | null {
  const error = useFieldError();

  if (!error) {
    return null;
  }

  return (
    <p
      className={["text-sm text-red-400", className].filter(Boolean).join(" ")}
      {...props}
    >
      {error}
    </p>
  );
}
