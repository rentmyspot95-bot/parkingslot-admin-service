import { HttpException, HttpStatus } from '@nestjs/common';

/** An HttpException that carries a stable machine-readable `code`. */
export class DomainException extends HttpException {
  constructor(code: string, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message }, status);
  }
}

export class NotFoundDomainException extends DomainException {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class BadRequestDomainException extends DomainException {
  constructor(message = 'Invalid request') {
    super('BAD_REQUEST', message, HttpStatus.BAD_REQUEST);
  }
}

export class ForbiddenDomainException extends DomainException {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedDomainException extends DomainException {
  constructor(message = 'Authentication required') {
    super('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }
}
