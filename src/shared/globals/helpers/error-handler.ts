import { StatusCodes } from 'http-status-codes';

export interface IErrorResponse {
  statusCode: number;
  message: string;
  status: string;
  serializeErrors(): IError;
}

export interface IError {
  message: string;
  statusCode: number;
  status: string;
}

export abstract class CustomError extends Error {
  public abstract statusCode: number;
  public abstract status: string;

  constructor(message: string) {
    super(message);
  }

  serializeErrors(): IError {
    return {
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
    };
  }
}

export class JoiRequestValidationError extends CustomError {
  statusCode = StatusCodes.BAD_REQUEST;
  status = 'Error';
  constructor(message: string) {
    super(message);
  }
}

export class BadRequestError extends CustomError {
  statusCode = StatusCodes.BAD_REQUEST;
  status = 'Error';
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends CustomError {
  statusCode = StatusCodes.NOT_FOUND;
  status = 'Error';
  constructor(message: string) {
    super(message);
  }
}

export class NotAuthorizedError extends CustomError {
  statusCode = StatusCodes.UNAUTHORIZED;
  status = 'Error';

  constructor(message: string) {
    super(message);
  }
}

export class FileTooLarge extends CustomError {
  statusCode = StatusCodes.REQUEST_TOO_LONG;
  status = 'Error';

  constructor(message: string) {
    super(message);
  }
}

export class ServerError extends CustomError {
  statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  status = 'Error';

  constructor(message: string) {
    super(message);
  }
}
