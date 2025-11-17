import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  profile: {
    id: string;
    name: string;
    bio: string;
    skills: string[];
    photo_url: string;
  };
  unreadCount: number;
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Fetch matches with profiles in a single query using joins
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          profile1:profiles!matches_user1_id_fkey(id, name, bio, skills, photo_url),
          profile2:profiles!matches_user2_id_fkey(id, name, bio, skills, photo_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch all last messages and counts in optimized queries
        const matchIds = data.map(m => m.id);
        
        const { data: messagesData } = await supabase
          .from('messages')
          .select('match_id, content, created_at, sender_id')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false });

        // Group messages by match_id
        const messagesByMatch = new Map();
        const unreadCountByMatch = new Map();
        
        messagesData?.forEach(msg => {
          if (!messagesByMatch.has(msg.match_id)) {
            messagesByMatch.set(msg.match_id, msg);
          }
          
          // Count unread messages (from other user)
          const match = data.find(m => m.id === msg.match_id);
          const otherUserId = match?.user1_id === user.id ? match?.user2_id : match?.user1_id;
          
          if (msg.sender_id === otherUserId) {
            const current = unreadCountByMatch.get(msg.match_id) || 0;
            unreadCountByMatch.set(msg.match_id, current + 1);
          }
        });

        const matchesWithProfiles = data.map((match) => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const profile = match.user1_id === user.id ? match.profile2 : match.profile1;
          const lastMessage = messagesByMatch.get(match.id);
          
          return {
            ...match,
            profile: profile || {
              id: otherUserId,
              name: 'Unknown',
              bio: '',
              skills: [],
              photo_url: '',
            },
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
            } : undefined,
            unreadCount: unreadCountByMatch.get(match.id) || 0,
          };
        });
        
        setMatches(matchesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.profile.photo_url ? (
          <Image source={{ uri: item.profile.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 9 ? '9+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.matchInfo}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchName}>{item.profile.name}</Text>
          {item.lastMessage && (
            <Text style={styles.timeText}>
              {new Date(item.lastMessage.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                ? new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(item.lastMessage.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        {item.lastMessage ? (
          <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
            {item.lastMessage.content}
          </Text>
        ) : (
          <Text style={styles.noMessages}>Start chatting!</Text>
        )}
      </View>
      <MessageCircle size={20} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Your <Text style={styles.headerUnderline}>Matches</Text></Text>
        <View style={styles.headerBar} />
      </View>
      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No matches yet. Keep swiping!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  headerContainer: {
    backgroundColor: '#161b22',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e6edf3',
  },
  headerUnderline: {
    color: '#2f81f7',
  },
  headerBar: {
    width: 50,
    height: 3,
    backgroundColor: '#238636',
    borderRadius: 2,
    marginTop: 8,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  matchCard: {
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0d1117',
    borderWidth: 2,
    borderColor: '#238636',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#238636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#da3633',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#161b22',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  matchInfo: {
    flex: 1,
    marginRight: 8,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e6edf3',
  },
  timeText: {
    fontSize: 12,
    color: '#7d8590',
  },
  lastMessage: {
    fontSize: 14,
    color: '#7d8590',
  },
  unreadMessage: {
    color: '#e6edf3',
    fontWeight: '600',
  },
  noMessages: {
    fontSize: 14,
    color: '#2f81f7',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#7d8590',
    textAlign: 'center',
    fontWeight: '600',
  },
});
