import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind class，行为与原型 `src/app/lib/utils.ts` 一致 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
