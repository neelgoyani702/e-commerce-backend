import { validationResult } from "express-validator";

/**
 * Middleware to check validation results from express-validator chains.
 * Returns 422 with first validation error if any exist.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(422).json({ message: first.msg, field: first.path });
  }
  next();
}
