/**
 * Domain errors — framework independent. The presentation layer maps these
 * to generic client messages; raw messages/stack traces are never sent to
 * the client for unexpected errors.
 */
export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found`);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You don't have permission to perform this action") {
    super("FORBIDDEN", message);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super("VALIDATION", message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}

export class RateLimitError extends DomainError {
  constructor(message = "Too many attempts. Please try again later.") {
    super("RATE_LIMITED", message);
  }
}
