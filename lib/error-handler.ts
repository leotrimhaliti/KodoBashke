import { Alert } from 'react-native';
import { logger } from './logger';
import { captureException } from './sentry';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export class AppError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function handleError(
  error: unknown,
  context: string,
  showAlert: boolean = true
): void {
  let errorMessage = 'An unexpected error occurred';
  let errorCode: string | undefined;

  if (error instanceof AppError) {
    errorMessage = error.message;
    errorCode = error.code;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Log the error
  logger.error(`Error in ${context}`, error, { context, errorCode });

  // Send to error tracking
  captureException(error, { context, errorCode });

  // Show alert to user if requested
  if (showAlert) {
    Alert.alert('Error', errorMessage);
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    );
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
