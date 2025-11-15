import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Animated, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  doc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import colors from "../theme/colors";
import { shadow, glassMorphism, createGradientBackground } from "../theme/styles";

export default function Chat({ navigation }) {
  const user = auth.currentUser;
  const [pressAnim] = useState(new Animated.Value(1));
  const [pairId, setPairId] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    findPair();
  }, [user]);

  const findPair = async () => {
    try {
      setLoading(true);
      console.log("Finding pairs for user:", user.uid);
      
      const q = query(collection(db, "pairs"), where("users", "array-contains", user.uid));
      const snap = await getDocs(q);
      
      console.log("Pairs found:", snap.size);
      
      if (snap.empty) {
        setLoading(false);
        return;
      }
      
      const pairDoc = snap.docs[0];
      const pairData = pairDoc.data();
      setPairId(pairDoc.id);
      
      // Get partner info
      const partnerId = pairData.users.find(uid => uid !== user.uid);
      console.log("Partner ID:", partnerId);
      
      if (partnerId) {
        const partnerDoc = await getDoc(doc(db, "users", partnerId));
        if (partnerDoc.exists()) {
          const partnerData = partnerDoc.data();
          setPartner({
            id: partnerId,
            name: partnerData.name,
            place: partnerData.place,
            code: partnerData.code
          });
          console.log("Partner found:", partnerData.name);
        }
      }
      
    } catch (error) {
      console.error("Error finding pair:", error);
      Alert.alert("Error", "Failed to load conversations. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pairId) return;

    console.log("Setting up real-time listener for pair:", pairId);
    
    const messagesRef = collection(db, "pairs", pairId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("New messages received:", messagesList.length);
        setMessages(messagesList);
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error("Error in messages listener:", error);
        Alert.alert("Connection Error", "Failed to load messages. Please check your connection.");
      }
    );

    return () => unsubscribe();
  }, [pairId]);

  const animatePress = (callback) => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(callback);
  };

  const sendMessage = async () => {
    if (sending || !message.trim() || !pairId) return;

    try {
      setSending(true);
      const messageText = message.trim();
      
      console.log("Sending message:", messageText);
      
      const messagesRef = collection(db, "pairs", pairId, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        from: user.uid,
        createdAt: Date.now(),
        timestamp: serverTimestamp()
      });
      
      console.log("Message sent successfully");
      setMessage("");
      
      // Update last activity in pair
      await addDoc(collection(db, "pairs", pairId, "activities"), {
        type: "message",
        from: user.uid,
        createdAt: Date.now()
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Send Failed", "Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.from === user.uid;
    const showAvatar = index === 0 || messages[index - 1]?.from !== item.from;
    
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        {!isMe && showAvatar && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {partner?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage,
          shadow.soft
        ]}>
          {!isMe && showAvatar && (
            <Text style={styles.senderName}>{partner?.name || 'Unknown'}</Text>
          )}
          <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        
        {isMe && showAvatar && (
          <View style={[styles.avatar, styles.myAvatar]}>
            <Text style={styles.avatarText}>
              {user.displayName?.charAt(0)?.toUpperCase() || 'Y'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 Chat</Text>
          <Text style={styles.subtitle}>Loading conversations...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Looking for your connections...</Text>
        </View>
      </View>
    );
  }

  if (!pairId || !partner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 Chat</Text>
          <Text style={styles.subtitle}>Start a conversation</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💭</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Connect with someone using their code to start chatting!
          </Text>
          <TouchableOpacity 
            style={[styles.connectBtn, shadow.glow, createGradientBackground(colors.primary, colors.accent)]}
            onPress={() => navigation.navigate('ConnectByCode')}
          >
            <Text style={styles.connectBtnText}>🔗 Connect with Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, shadow.soft]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>💬 {partner.name}</Text>
            <Text style={styles.subtitle}>
              {partner.place} • Code: {partner.code}
            </Text>
          </View>
          <View style={styles.status}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>Start the conversation!</Text>
            <Text style={styles.welcomeText}>
              Say hello to {partner.name} and start your chat journey together.
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, shadow.card]}>
        <TextInput
          style={[styles.input, shadow.soft]}
          placeholder={`Message ${partner.name}...`}
          placeholderTextColor={colors.textDim}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              shadow.glow,
              (!message.trim() || sending) && styles.sendButtonDisabled,
              createGradientBackground(colors.primary, colors.accent)
            ]}
            onPress={() => animatePress(sendMessage)}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.sendText}>📤</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bg 
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: colors.text,
    marginBottom: 2
  },
  subtitle: { 
    fontSize: 12, 
    color: colors.textDim 
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  statusText: {
    color: colors.textDim,
    fontSize: 12
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    color: colors.textDim,
    fontSize: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20
  },
  emptyEmoji: {
    fontSize: 64
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center'
  },
  emptyText: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20
  },
  connectBtn: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14
  },
  connectBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16
  },
  messagesContainer: { 
    padding: 16,
    paddingBottom: 20
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8
  },
  myMessageContainer: {
    justifyContent: 'flex-end'
  },
  theirMessageContainer: {
    justifyContent: 'flex-start'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  myAvatar: {
    backgroundColor: colors.accent
  },
  avatarText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold'
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 4
  },
  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4
  },
  theirMessage: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4
  },
  senderName: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  myMessageText: { 
    color: colors.text, 
    fontSize: 16,
    lineHeight: 20
  },
  theirMessageText: { 
    color: colors.text, 
    fontSize: 16,
    lineHeight: 20
  },
  timestamp: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16
  },
  welcomeEmoji: {
    fontSize: 48
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center'
  },
  welcomeText: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
    minHeight: 44
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendText: { 
    fontSize: 18 
  }
});