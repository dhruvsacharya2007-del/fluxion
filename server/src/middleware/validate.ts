import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors";

export function validate<Schema extends ZodType>(schema: Schema): RequestHandler {
  return (req, _res, next) => {
    console.log("EMAIL CHARS:", JSON.stringify([...(req.body?.email ?? "")].map((c) => c.charCodeAt(0)))); // TEMP
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      const formErrors: string[] = [];
      for (const issue of result.error.issues) {
        if (issue.path.length === 0) {
          formErrors.push(issue.message);
        } else {
          const key = issue.path.map(String).join(".");
          (fieldErrors[key] ??= []).push(issue.message);
        }
      }
      return next(new ValidationError(fieldErrors, formErrors));
    }
    req.body = result.data;
    next();
  };
}