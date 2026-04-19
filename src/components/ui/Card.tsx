import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl bg-white/10 p-6 shadow-md backdrop-blur",
        className,
      )}
    />
  );
}
