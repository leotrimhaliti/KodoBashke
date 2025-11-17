type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = __DEV__;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context, null, 2) : '';
    
    if (this.isDevelopment) {
      const emoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      };
      
      console.log(`${emoji[level]} [${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (contextStr) console.log(contextStr);
    } else {
      // In production, send to error tracking service
      console.log(JSON.stringify({ timestamp, level, message, context }));
    }
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.formatMessage('error', message, errorContext);
  }
}

export const logger = new Logger();
