import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price in EUR using the Italian locale */
export function formatPrice(price: number | string | { toString(): string }): string {
  const num = typeof price === "object" ? Number(price.toString()) : Number(price);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

/** Generate a URL-friendly slug from a string */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Build a query string from an object, skipping null/undefined/empty */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

/** Parse a decimal value from Prisma to a JavaScript number */
export function parseDecimal(value: { toString(): string } | string | number): number {
  return typeof value === "object" ? Number(value.toString()) : Number(value);
}
