import * as yup from "yup";

export const todoInsertSchema = yup.object({
  name: yup
    .string()
    .transform((v) => (v == null ? v : String(v).trim()))
    .min(1, "Name cannot be empty.")
    .max(500, "Name must be at most 500 characters.")
    .required("Name is required."),
  resolved: yup.boolean().required(),
});

export const todoSetSchema = yup.object({
  resolved: yup.boolean().required(),
});

export function formatYupError(err) {
  if (err instanceof yup.ValidationError) {
    return err.errors.length ? err.errors[0] : err.message;
  }
  return err?.message || "Validation failed.";
}
