import type { Priority, Size } from "@/types";

const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];
const VALID_SIZES: Size[] = ["S", "M", "L"];

export function validateId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 255;
}

export function validateName(name: unknown): string | null {
  if (typeof name !== "string" || name.trim().length === 0) return "Name is required";
  if (name.length > 500) return "Name is too long (max 500 characters)";
  return null;
}

export function validateStatus(value: unknown, validValues: readonly string[]): string | null {
  if (typeof value !== "string" || !validValues.includes(value)) {
    return `Invalid status. Must be one of: ${validValues.join(", ")}`;
  }
  return null;
}

export function validatePriority(p: unknown): string | null {
  if (p === undefined || p === null || p === "") return null; // optional
  return validateStatus(p, VALID_PRIORITIES);
}

export function validateSize(s: unknown): string | null {
  if (s === undefined || s === null || s === "") return null; // optional
  return validateStatus(s, VALID_SIZES);
}

export function validateDate(d: unknown): string | null {
  if (d === undefined || d === null || d === "") return null;
  if (typeof d !== "string") return "Invalid date format";
  const parsed = Date.parse(d);
  if (isNaN(parsed)) return "Invalid date format";
  return null;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function isOverdue(deadlineAt: string | null): boolean {
  if (!deadlineAt) return false;
  return new Date(deadlineAt) < new Date();
}

export function isDueThisWeek(deadlineAt: string | null): boolean {
  if (!deadlineAt) return false;
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  return deadline >= now && deadline <= endOfWeek;
}

export function isScheduledToday(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false;
  const scheduled = new Date(scheduledAt);
  const now = new Date();
  return (
    scheduled.getFullYear() === now.getFullYear() &&
    scheduled.getMonth() === now.getMonth() &&
    scheduled.getDate() === now.getDate()
  );
}
