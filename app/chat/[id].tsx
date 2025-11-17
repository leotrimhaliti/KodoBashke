import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, ArrowLeft } from 'lucide-react-native';
import { messageSchema } from '@/lib/validators';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserPhoto, setOtherUserPhoto] = useState('');
  const [myPhoto, setMyPhoto] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || !user) return;

    fetchMessages();
    fetchOtherUser();

    const channel = supabase
      .channel(`match-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', id)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoading(false);
  };

  const fetchOtherUser = async () => {
    if (!user) return;

    const { data: match } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', id)
      .single();

    if (match) {
      const otherUserId =
        match.user1_id === user.id ? match.user2_id : match.user1_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, photo_url')
        .eq('id', otherUserId)
        .single();

      if (profile) {
        setOtherUserName(profile.name);
        setOtherUserPhoto(profile.photo_url || '');
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('photo_url')
        .eq('id', user.id)
        .single();

      if (myProfile) setMyPhoto(myProfile.photo_url || '');
    }
  };

  const sendMessage = async () => {
    if (!user || sending) return;
    
    const content = newMessage.trim();
    if (!content) return;

    // Validate message
    const validation = messageSchema.safeParse({
      content,
      match_id: id,
    });
    
    if (!validation.success) {
      logger.warn('Invalid message format', { errors: validation.error.errors });
      return;
    }

    // Rate limiting
    const rateLimit = rateLimiter.check(`message:${user.id}`, RATE_LIMITS.MESSAGE);
    if (!rateLimit.allowed) {
      logger.warn('Message rate limit exceeded', { userId: user.id });
      return;
    }

    setNewMessage('');
    setSending(true);

    try {
      logger.info('Sending message', { userId: user.id, matchId: id });
      
      const { error } = await supabase.from('messages').insert({
        match_id: id,
        sender_id: user.id,
        content,
      });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to send message', error, { userId: user.id, matchId: id });
      captureException(error, { context: 'send-message' });
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    const photo = isMyMessage ? myPhoto : otherUserPhoto;

    const avatarInitial = isMyMessage
      ? user?.email?.charAt(0).toUpperCase() || 'M'
      : otherUserName.charAt(0).toUpperCase();

    return (
      <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
        {!isMyMessage && (
          <View style={styles.avatarWrapper}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>{avatarInitial}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.messageBubbleWrapper}>
          <View
            style={[
              styles.messageContainer,
              isMyMessage ? styles.myMessage : styles.theirMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.theirMessageText,
              ]}
            >
              {item.content}
            </Text>
          </View>

          <Text style={[styles.timeStamp, isMyMessage && styles.myTimeStamp]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {isMyMessage && (
          <View style={styles.avatarWrapper}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatar, styles.myAvatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>{avatarInitial}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {/* HIDE DEFAULT HEADER */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* CUSTOM HEADER */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <ArrowLeft size={24} color="#7d8590" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {otherUserPhoto ? (
            <Image source={{ uri: otherUserPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.headerTitle}>{otherUserName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#7d8590"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
            activeOpacity={0.7}
          >
            <Send size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: '#161b22',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerBackBtn: {
    padding: 8,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#238636',
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#238636',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#238636',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e6edf3',
  },

  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d1117',
  },
  messagesList: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161b22',
    borderWidth: 1.5,
    borderColor: '#30363d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  messageAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7d8590',
  },
  myAvatarPlaceholder: {
    backgroundColor: '#238636',
  },
  avatarPlaceholderText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  messageBubbleWrapper: {
    maxWidth: '75%',
    marginHorizontal: 8,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessage: {
    backgroundColor: '#238636',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#161b22',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  myMessageText: {
    color: '#ffffff',
    fontWeight: '400',
  },
  theirMessageText: {
    color: '#e6edf3',
    fontWeight: '400',
  },
  timeStamp: {
    fontSize: 11,
    color: '#7d8590',
    marginTop: 4,
    marginLeft: 12,
    fontWeight: '400',
  },
  myTimeStamp: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 12,
  },

  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#161b22',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#e6edf3',
    fontWeight: '400',
  },
  sendButton: {
    backgroundColor: '#238636',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#30363d',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
});
