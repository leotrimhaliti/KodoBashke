import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { loginSchema } from '@/lib/validators';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join('\n');
      Alert.alert('Validation Error', errors);
      return;
    }

    // Rate limiting
    const rateLimit = rateLimiter.check(`login:${email}`, RATE_LIMITS.LOGIN);
    if (!rateLimit.allowed) {
      Alert.alert(
        'Too Many Attempts',
        `Please try again in ${rateLimit.retryAfter} seconds`
      );
      return;
    }

    setLoading(true);
    try {
      logger.info('Login attempt', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Login failed', error, { email });
        captureException(error, { context: 'login', email });
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (data.user) {
        logger.info('Login successful', { userId: data.user.id });
        
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          logger.error('Profile fetch failed', profileError);
        }

        if (profile) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
        
        // Reset rate limit on success
        rateLimiter.reset(`login:${email}`);
      }
    } catch (error) {
      logger.error('Unexpected login error', error);
      captureException(error, { context: 'login' });
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <Image
            source={require('@/public/assets/images/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Sign in to KodoBashke</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#7d8590"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#7d8590"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to KodoBashke? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#e6edf3',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  form: {
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e6edf3',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    color: '#e6edf3',
  },
  button: {
    backgroundColor: '#238636',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 24,
    alignItems: 'center',
  },
  dividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#30363d',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  signupText: {
    fontSize: 14,
    color: '#7d8590',
  },
  signupLink: {
    fontSize: 14,
    color: '#2f81f7',
    fontWeight: '600',
  },
});
