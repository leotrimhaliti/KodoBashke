import * as Sentry from '@sentry/react-native';

// Initialize Sentry
// Replace with your actual Sentry DSN from https://sentry.io
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  if (!__DEV__ && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: false,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: 1.0, // Adjust in production (0.1 = 10%)
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        return event;
      },
    });
  }
}

export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (__DEV__) {
    console.error('Error captured:', error, context);
  } else {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (__DEV__) {
    console.log(`[${level}] ${message}`);
  } else {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}
