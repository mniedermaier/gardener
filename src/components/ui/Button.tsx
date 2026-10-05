import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "danger-ghost";

const variants: Record<Variant, string> = {
  primary: "bg-garden-600 text-white shadow-xs hover:bg-garden-700 dark:hover:bg-garden-500",
  secondary: "border border-gray-300 bg-white text-gray-800 shadow-xs hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10",
  danger: "bg-danger text-white hover:brightness-110 dark:text-gray-950",
  ghost: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10",
  "danger-ghost": "text-danger hover:bg-danger/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "min-h-8 px-3 py-1 text-sm",
  md: "min-h-11 px-4 py-2 text-sm sm:min-h-10",
  lg: "min-h-12 px-6 py-3 text-base",
};

export function Button({ variant = "primary", size = "md", className = "", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
