import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-white placeholder:text-white/40 focus:border-brand focus:outline-none",
        className,
      )}
    />
  );
}
