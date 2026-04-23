import { z } from "zod";

export const todoInsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty.")
    .max(500, "Name must be at most 500 characters."),
  resolved: z.boolean(),
});

export const todoSetSchema = z.object({
  resolved: z.boolean(),
});

export function formatZodError(err) {
  if (err instanceof z.ZodError) {
    const [first] = err.issues;
    return first?.message ?? "Validation failed.";
  }
  return err instanceof Error ? err.message : "Validation failed.";
}
