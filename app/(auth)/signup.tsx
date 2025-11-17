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

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else if (data.user) {
      router.replace('/(auth)/onboarding');
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
          <Text style={styles.title}>Join KodoBashke</Text>
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
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#7d8590"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={styles.hint}>
              Make sure it's at least 6 characters.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign in</Text>
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
  hint: {
    fontSize: 12,
    color: '#7d8590',
    marginTop: 6,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  loginText: {
    fontSize: 14,
    color: '#7d8590',
  },
  loginLink: {
    fontSize: 14,
    color: '#2f81f7',
    fontWeight: '600',
  },
});
