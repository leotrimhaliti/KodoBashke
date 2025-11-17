import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Github, Globe, LogOut, Edit2, Save, X, Camera } from 'lucide-react-native';
import { profileSchema } from '@/lib/validators';
import { optimizeImage } from '@/lib/image-utils';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

interface Profile {
  name: string;
  bio: string;
  skills: string[];
  interests: string[];
  github_url: string;
  portfolio_url: string;
  photo_url: string;
}

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

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      // Initialize edit state with current profile data
      setEditName(data.name);
      setEditBio(data.bio || '');
      setEditSkills(data.skills || []);
      setEditInterests(data.interests || []);
      setEditGithubUrl(data.github_url || '');
      setEditPortfolioUrl(data.portfolio_url || '');
      setEditPhotoUrl(data.photo_url || '');
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to original values
    if (profile) {
      setEditName(profile.name);
      setEditBio(profile.bio || '');
      setEditSkills(profile.skills || []);
      setEditInterests(profile.interests || []);
      setEditGithubUrl(profile.github_url || '');
      setEditPortfolioUrl(profile.portfolio_url || '');
      setEditPhotoUrl(profile.photo_url || '');
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate profile data
    const profileData = {
      name: editName,
      bio: editBio,
      skills: editSkills,
      interests: editInterests,
      github_url: editGithubUrl,
      portfolio_url: editPortfolioUrl,
      photo_url: editPhotoUrl,
    };

    const validation = profileSchema.safeParse(profileData);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      Alert.alert('Validation Error', errors);
      return;
    }

    // Rate limiting
    const rateLimit = rateLimiter.check(`profile-update:${user.id}`, RATE_LIMITS.PROFILE_UPDATE);
    if (!rateLimit.allowed) {
      Alert.alert('Too Fast', 'Please wait a moment before updating again');
      return;
    }

    setSaving(true);
    try {
      logger.info('Updating profile', { userId: user.id });
      
      const { error } = await supabase
        .from('profiles')
        .update(validation.data)
        .eq('id', user.id);

      if (error) throw error;
      
      logger.info('Profile updated successfully', { userId: user.id });
      setIsEditing(false);
      fetchProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      logger.error('Profile update failed', error, { userId: user.id });
      captureException(error, { context: 'profile-update' });
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setEditSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setEditInterests((prev) =>
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

    // Rate limiting
    const rateLimit = rateLimiter.check(`image-upload:${user.id}`, RATE_LIMITS.IMAGE_UPLOAD);
    if (!rateLimit.allowed) {
      Alert.alert('Upload Limit', `Please wait ${rateLimit.retryAfter} seconds before uploading again`);
      return;
    }

    setUploading(true);
    try {
      logger.info('Optimizing image', { userId: user.id });
      
      // Optimize image before upload
      const optimizedUri = await optimizeImage(uri, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      if (!optimizedUri) {
        throw new Error('Failed to optimize image');
      }

      const fileExt = 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      logger.info('Uploading image to storage', { userId: user.id, filePath });

      // For React Native, we need to create a FormData object
      const formData = new FormData();
      formData.append('file', {
        uri: optimizedUri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditPhotoUrl(publicUrl);
      logger.info('Image uploaded successfully', { userId: user.id });
      Alert.alert('Success', 'Photo uploaded! Remember to save your profile.');
    } catch (error: any) {
      logger.error('Image upload failed', error, { userId: user.id });
      captureException(error, { context: 'image-upload' });
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pro<Text style={styles.titleUnderline}>file</Text></Text>
          <View style={styles.headerBar} />
        </View>
        <View style={styles.headerButtons}>
          {!isEditing && (
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <Edit2 size={22} color="#238636" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <LogOut size={22} color="#da3633" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {isEditing ? (
          // Edit Mode
          <>
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickImage}
                disabled={uploading}
              >
                {editPhotoUrl ? (
                  <Image source={{ uri: editPhotoUrl }} style={styles.avatar} />
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
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell others about yourself..."
                value={editBio}
                onChangeText={setEditBio}
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
                      styles.tagEditable,
                      editSkills.includes(skill) && styles.tagSelected,
                    ]}
                    onPress={() => toggleSkill(skill)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        editSkills.includes(skill) && styles.tagTextSelected,
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
                      styles.tagEditable,
                      editInterests.includes(interest) && styles.tagSelected,
                    ]}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        editInterests.includes(interest) && styles.tagTextSelected,
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
                value={editGithubUrl}
                onChangeText={setEditGithubUrl}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Portfolio URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://yoursite.com"
                value={editPortfolioUrl}
                onChangeText={setEditPortfolioUrl}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={saving}
              >
                <X size={20} color="#7d8590" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // View Mode
          <>
            {profile.photo_url && (
              <View style={styles.avatarSection}>
                <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
              </View>
            )}

            <Text style={styles.name}>{profile.name}</Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            {profile.skills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ski<Text style={styles.sectionTitleUnderline}>lls</Text></Text>
                <View style={styles.tagContainer}>
                  {profile.skills.map((skill) => (
                    <View key={skill} style={styles.tag}>
                      <Text style={styles.tagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profile.interests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inte<Text style={styles.sectionTitleUnderline}>rests</Text></Text>
                <View style={styles.tagContainer}>
                  {profile.interests.map((interest) => (
                    <View key={interest} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(profile.github_url || profile.portfolio_url) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Links</Text>
                {profile.github_url && (
                  <View style={styles.linkRow}>
                    <Github size={20} color="#7d8590" />
                    <Text style={styles.linkText}>{profile.github_url}</Text>
                  </View>
                )}
                {profile.portfolio_url && (
                  <View style={styles.linkRow}>
                    <Globe size={20} color="#7d8590" />
                    <Text style={styles.linkText}>{profile.portfolio_url}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e6edf3',
  },
  titleUnderline: {
    color: '#2f81f7',
  },
  headerBar: {
    width: 40,
    height: 3,
    backgroundColor: '#238636',
    borderRadius: 2,
    marginTop: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#0d1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  content: {
    padding: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#e6edf3',
  },
  bio: {
    fontSize: 15,
    color: '#7d8590',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#e6edf3',
  },
  sectionTitleUnderline: {
    color: '#2f81f7',
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  tagEditable: {
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
    fontSize: 13,
    color: '#7d8590',
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    backgroundColor: '#161b22',
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  linkText: {
    fontSize: 14,
    color: '#2f81f7',
    flex: 1,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: '#238636',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  cancelButtonText: {
    color: '#7d8590',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#7d8590',
    textAlign: 'center',
    fontWeight: '600',
  },
});
