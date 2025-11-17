import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Camera } from 'lucide-react-native';

const SKILL_OPTIONS = [
  'React',
  'React Native',
  'TypeScript',
  'Node.js',
  'Python',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'Design',
  'Product',
  'Marketing',
];

const INTEREST_OPTIONS = [
  'Mobile Apps',
  'Web Apps',
  'SaaS',
  'Open Source',
  'AI/ML',
  'Crypto/Web3',
  'Gaming',
  'DevTools',
  'E-commerce',
  'Social',
];

export default function Onboarding() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // For React Native, we need to create a FormData object
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      Alert.alert('Success', 'Photo uploaded!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!name || selectedSkills.length === 0 || selectedInterests.length === 0) {
      Alert.alert('Error', 'Please fill in your name, skills, and interests');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      name,
      bio,
      skills: selectedSkills,
      interests: selectedInterests,
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
      photo_url: photoUrl,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.title}>Complete Your <Text style={styles.titleUnderline}>Profile</Text></Text>
        <View style={styles.underlineBar} />
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={pickImage}
          disabled={uploading}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Camera size={32} color="#666" />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to add profile photo (optional)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell others about yourself..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Skills *</Text>
        <View style={styles.tagContainer}>
          {SKILL_OPTIONS.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.tag,
                selectedSkills.includes(skill) && styles.tagSelected,
              ]}
              onPress={() => toggleSkill(skill)}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedSkills.includes(skill) && styles.tagTextSelected,
                ]}
              >
                {skill}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Interests *</Text>
        <View style={styles.tagContainer}>
          {INTEREST_OPTIONS.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.tag,
                selectedInterests.includes(interest) && styles.tagSelected,
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedInterests.includes(interest) && styles.tagTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>GitHub URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://github.com/username"
          value={githubUrl}
          onChangeText={setGithubUrl}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Portfolio URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://yoursite.com"
          value={portfolioUrl}
          onChangeText={setPortfolioUrl}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Profile...' : '✓ Complete Profile'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#e6edf3',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleUnderline: {
    color: '#2f81f7',
  },
  underlineBar: {
    width: 50,
    height: 3,
    backgroundColor: '#238636',
    borderRadius: 2,
    marginTop: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#161b22',
    borderWidth: 3,
    borderColor: '#238636',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#161b22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#30363d',
    borderStyle: 'dashed',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(35, 134, 54, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 14,
    color: '#7d8590',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e6edf3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#161b22',
    color: '#e6edf3',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  tagSelected: {
    backgroundColor: '#238636',
    borderColor: '#238636',
  },
  tagText: {
    fontSize: 14,
    color: '#7d8590',
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#238636',
    padding: 18,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
