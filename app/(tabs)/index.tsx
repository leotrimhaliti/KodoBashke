import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { X, Heart, Github, Globe } from 'lucide-react-native';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface Profile {
  id: string;
  name: string;
  bio: string;
  skills: string[];
  interests: string[];
  github_url: string;
  portfolio_url: string;
  photo_url: string;
}

export default function Discover() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // First, get all user IDs that we've already swiped on
      const { data: swipedUsers, error: swipeError } = await supabase
        .from('swipes')
        .select('target_user_id')
        .eq('user_id', user.id);
      
      if (swipeError) throw swipeError;
      
      const swipedIds = swipedUsers?.map(s => s.target_user_id) || [];
      
      // Fetch profiles excluding our own ID and anyone we've swiped on
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .not('id', 'in', `(${swipedIds.length > 0 ? swipedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .limit(20);

      if (error) throw error;
      
      if (data) {
        setProfiles(data);
        setCurrentIndex(0);
      }
    } catch (error) {
      logger.error('Failed to fetch profiles', error, { userId: user.id });
      captureException(error, { context: 'fetch-profiles' });
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (isLike: boolean) => {
    if (swiping || !user || currentIndex >= profiles.length) return;

    // Rate limiting
    const rateLimit = rateLimiter.check(`swipe:${user.id}`, RATE_LIMITS.SWIPE);
    if (!rateLimit.allowed) {
      logger.warn('Swipe rate limit exceeded', { userId: user.id });
      return;
    }

    setSwiping(true);
    const targetProfile = profiles[currentIndex];

    try {
      logger.info('Swipe action', { 
        userId: user.id, 
        targetUserId: targetProfile.id, 
        isLike 
      });

      const { error } = await supabase.from('swipes').insert({
        user_id: user.id,
        target_user_id: targetProfile.id,
        is_like: isLike,
      });

      if (error) throw error;
      
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      logger.error('Swipe failed', error, { 
        userId: user.id,
        targetUserId: targetProfile.id 
      });
      captureException(error, { context: 'swipe' });
    } finally {
      setSwiping(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No more profiles to show!</Text>
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={() => {
            setCurrentIndex(0);
            fetchProfiles();
          }}
        >
          <Text style={styles.reloadButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Kodo<Text style={styles.headerUnderline}>Bashke</Text></Text>
        <View style={styles.headerBar} />
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <ScrollView style={styles.cardScroll}>
            <View style={styles.cardContent}>
              {currentProfile.photo_url && (
                <Image
                  source={{ uri: currentProfile.photo_url }}
                  style={styles.profilePhoto}
                />
              )}
              <Text style={styles.name}>{currentProfile.name}</Text>
              {currentProfile.bio && (
                <Text style={styles.bio}>{currentProfile.bio}</Text>
              )}

              {currentProfile.skills.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Skills</Text>
                  <View style={styles.tagContainer}>
                    {currentProfile.skills.map((skill) => (
                      <View key={skill} style={styles.tag}>
                        <Text style={styles.tagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {currentProfile.interests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.tagContainer}>
                    {currentProfile.interests.map((interest) => (
                      <View key={interest} style={styles.tag}>
                        <Text style={styles.tagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(currentProfile.github_url || currentProfile.portfolio_url) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Links</Text>
                  {currentProfile.github_url && (
                    <View style={styles.linkRow}>
                      <Github size={20} color="#000" />
                      <Text style={styles.linkText}>
                        {currentProfile.github_url}
                      </Text>
                    </View>
                  )}
                  {currentProfile.portfolio_url && (
                    <View style={styles.linkRow}>
                      <Globe size={20} color="#000" />
                      <Text style={styles.linkText}>
                        {currentProfile.portfolio_url}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleSwipe(false)}
          disabled={swiping}
        >
          <X size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe(true)}
          disabled={swiping}
        >
          <Heart size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#e6edf3',
    letterSpacing: -0.3,
  },
  headerUnderline: {
    color: '#2f81f7',
  },
  headerBar: {
    width: 50,
    height: 3,
    backgroundColor: '#238636',
    borderRadius: 2,
    marginTop: 6,
  },
  cardContainer: {
    flex: 1,
    width: CARD_WIDTH,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  cardScroll: {
    flex: 1,
  },
  cardContent: {
    padding: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#0d1117',
    borderWidth: 3,
    borderColor: '#238636',
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
  tagText: {
    fontSize: 13,
    color: '#7d8590',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    backgroundColor: '#0d1117',
    padding: 12,
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
  actions: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
  },
  passButton: {
    backgroundColor: '#da3633',
    borderColor: '#da3633',
  },
  likeButton: {
    backgroundColor: '#238636',
    borderColor: '#238636',
  },
  emptyText: {
    fontSize: 18,
    color: '#7d8590',
    marginBottom: 24,
    fontWeight: '600',
  },
  reloadButton: {
    backgroundColor: '#238636',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 6,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
