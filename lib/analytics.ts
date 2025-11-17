import { useEffect } from 'react';
import { logger } from './logger';
import { captureException, captureMessage } from './sentry';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

class Analytics {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !__DEV__;
  }

  track(event: AnalyticsEvent): void {
    if (!this.isEnabled) {
      logger.debug('Analytics event', event);
      return;
    }

    try {
      // In production, send to analytics service (e.g., Amplitude, Mixpanel, PostHog)
      // For now, just log
      logger.info('Analytics event', event);
      
      // Example: Send to your analytics service
      // fetch('https://api.analytics.com/track', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (error) {
      logger.error('Analytics tracking failed', error);
      captureException(error, { context: 'analytics' });
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.isEnabled) {
      logger.debug('Analytics identify', { userId, traits });
      return;
    }

    logger.info('User identified', { userId, traits });
  }

  screen(screenName: string, properties?: Record<string, any>): void {
    this.track({
      name: `Screen Viewed: ${screenName}`,
      properties,
    });
  }
}

export const analytics = new Analytics();

// Common event helpers
export const trackEvent = {
  // Auth events
  login: (method: string = 'email') => 
    analytics.track({ name: 'User Logged In', properties: { method } }),
  
  signup: (method: string = 'email') => 
    analytics.track({ name: 'User Signed Up', properties: { method } }),
  
  logout: () => 
    analytics.track({ name: 'User Logged Out' }),

  // Profile events
  profileCreated: () => 
    analytics.track({ name: 'Profile Created' }),
  
  profileUpdated: () => 
    analytics.track({ name: 'Profile Updated' }),
  
  photoUploaded: () => 
    analytics.track({ name: 'Photo Uploaded' }),

  // Swipe events
  swiped: (isLike: boolean) => 
    analytics.track({ 
      name: 'Profile Swiped', 
      properties: { action: isLike ? 'like' : 'pass' } 
    }),
  
  matched: () => 
    analytics.track({ name: 'Match Created' }),

  // Chat events
  messageSent: (matchId: string) => 
    analytics.track({ 
      name: 'Message Sent', 
      properties: { matchId } 
    }),
  
  chatOpened: (matchId: string) => 
    analytics.track({ 
      name: 'Chat Opened', 
      properties: { matchId } 
    }),

  // Error events
  error: (errorType: string, message: string) => 
    analytics.track({ 
      name: 'Error Occurred', 
      properties: { errorType, message } 
    }),
};

// Screen tracking hook
export function useScreenTracking(screenName: string, properties?: Record<string, any>) {
  useEffect(() => {
    analytics.screen(screenName, properties);
  }, [screenName, properties]);
}
