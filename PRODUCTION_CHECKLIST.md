# Production Deployment Checklist

## Environment Variables
- [ ] Set up `.env` file with production credentials
- [ ] Add `EXPO_PUBLIC_SENTRY_DSN` for error tracking
- [ ] Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Database Setup
1. Run all SQL migration files in order:
   ```sql
   -- 1. Run supabase-schema.sql
   -- 2. Run supabase-storage-policies.sql
   -- 3. Run supabase-indexes.sql (NEW - for performance)
   -- 4. Run enable-realtime.sql
   ```

2. Create Storage Bucket:
   - Go to Supabase Dashboard > Storage
   - Create new bucket named `avatars`
   - Make it public
   - Apply storage policies from `supabase-storage-policies.sql`

## Sentry Error Tracking Setup
1. Create account at https://sentry.io
2. Create new React Native project
3. Copy DSN and add to `.env`:
   ```
   EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
   ```

## Security Checklist
- [x] Environment validation implemented
- [x] Input validation on all user inputs
- [x] Rate limiting on critical operations
- [x] RLS policies enabled on all tables
- [ ] Review and test all RLS policies
- [ ] Ensure service keys are never exposed in client

## Performance Optimizations
- [x] Database indexes added
- [x] N+1 queries fixed (matches screen)
- [x] Image optimization before upload
- [ ] Test app performance under load
- [ ] Consider implementing pagination for profiles

## Monitoring & Logging
- [x] Structured logging implemented
- [x] Error tracking with Sentry
- [x] Analytics tracking setup
- [ ] Connect analytics to service (Amplitude/Mixpanel/PostHog)
- [ ] Set up performance monitoring

## Testing (Optional but Recommended)
- [ ] Add unit tests for validators
- [ ] Add integration tests for critical flows
- [ ] Test on real devices (iOS & Android)
- [ ] Load testing with multiple users

## Build & Deploy
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Configure EAS: `eas build:configure`
- [ ] Create production builds:
  ```bash
  eas build --platform ios --profile production
  eas build --platform android --profile production
  ```
- [ ] Submit to app stores:
  ```bash
  eas submit --platform ios
  eas submit --platform android
  ```

## Post-Launch Monitoring
- [ ] Monitor Sentry for errors
- [ ] Check analytics for user behavior
- [ ] Review database query performance
- [ ] Monitor API rate limits
- [ ] Set up alerts for critical errors

## Rate Limits Configured
- Login: 5 attempts per 15 minutes
- Signup: 3 attempts per hour
- Messages: 30 per minute
- Swipes: 100 per minute
- Profile updates: 10 per minute
- Image uploads: 5 per 5 minutes

## Features Implemented
✅ Environment validation with Zod
✅ Comprehensive error tracking (Sentry)
✅ Input validation schemas
✅ Optimized database queries (no N+1)
✅ Database indexes for performance
✅ Structured logging system
✅ Rate limiting on all operations
✅ Image optimization before upload
✅ Error boundaries throughout app
✅ Analytics tracking framework

## Recommended Next Steps
1. Run database migrations in Supabase SQL editor
2. Set up Sentry account and add DSN to .env
3. Test all features thoroughly
4. Review and audit security policies
5. Set up staging environment for testing
6. Configure EAS Build for app store deployment
