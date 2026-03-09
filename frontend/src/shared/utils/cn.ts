import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 * Useful for conditional classes and avoiding conflicts
 * 
 * @example
 * cn("px-2 py-1", "px-4") // => "py-1 px-4"
 * cn("text-red-500", condition && "text-blue-500") // => "text-blue-500" if condition is true
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
