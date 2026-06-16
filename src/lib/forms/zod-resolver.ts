import { toNestErrors } from "@hookform/resolvers";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

function zodIssuesToFlatErrors(
  issues: z.core.$ZodIssue[]
): Record<string, { type: string; message: string }> {
  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    if (!path || errors[path]) continue;
    errors[path] = { type: issue.code, message: issue.message };
  }
  return errors;
}

/**
 * Zod v4 resolver that uses schema.safeParse directly.
 * Avoids @hookform/resolvers/zod bundling issues with zod/v4/core in Webpack
 * (runtime: "Cannot read properties of undefined (reading 'apply')").
 */
export function createZodResolver<T extends FieldValues>(
  schema: z.ZodType<T>
): Resolver<T> {
  return (values, _context, options) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    return {
      values: {},
      errors: toNestErrors(zodIssuesToFlatErrors(result.error.issues), options!),
    };
  };
}
