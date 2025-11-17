import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      if (session?.user) {
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
        });
        analytics.identify(session.user.id, {
          email: session.user.email,
        });
        logger.info('User session restored', { userId: session.user.id });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setSentryUser({
            id: session.user.id,
            email: session.user.email,
          });
          analytics.identify(session.user.id, {
            email: session.user.email,
          });
          logger.info('Auth state changed', { event, userId: session.user.id });
        } else {
          clearSentryUser();
          logger.info('User signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
