import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200/80 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900 ${className}`}>
      {children}
    </div>
  );
}
