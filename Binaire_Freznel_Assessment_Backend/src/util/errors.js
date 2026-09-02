// Error types. Each one carries an HTTP status and code so the error
// middleware can just forward them.
export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL' } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, { status: 400, code: 'VALIDATION' });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

// Thrown when the queue is at capacity. We reject with a retryable 503
// rather than block the uploader. See docs/DEADLOCKS.md.
export class QueueFullError extends AppError {
  constructor(capacity) {
    super(`Queue is at capacity (${capacity}). Retry shortly.`, {
      status: 503,
      code: 'QUEUE_FULL',
    });
    this.retryable = true;
  }
}

export class ForbiddenError extends AppError {
  constructor(message) {
    super(message, { status: 403, code: 'FORBIDDEN' });
  }
}
