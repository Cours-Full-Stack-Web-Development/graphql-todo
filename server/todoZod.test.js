import { describe, expect, it } from "vitest";
import { formatZodError, todoInsertSchema, todoSetSchema } from "./todoZod.js";

describe("todo validation", () => {
  it("trims valid todo names before insertion", () => {
    const todo = todoInsertSchema.parse({
      name: "  Write unit tests  ",
      resolved: false,
    });

    expect(todo).toEqual({
      name: "Write unit tests",
      resolved: false,
    });
  });

  it("formats validation errors for empty todo names", () => {
    const result = todoInsertSchema.safeParse({
      name: "   ",
      resolved: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toBe("Name cannot be empty.");
    }
  });

  it("rejects todo names longer than 500 characters", () => {
    const result = todoInsertSchema.safeParse({
      name: "x".repeat(501),
      resolved: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toBe(
        "Name must be at most 500 characters.",
      );
    }
  });

  it("requires a boolean resolved value when updating a todo", () => {
    const result = todoSetSchema.safeParse({ resolved: "yes" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toContain("Expected boolean");
    }
  });
});
