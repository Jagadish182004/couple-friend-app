import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView, ActivityIndicator } from "react-native";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import colors from "../theme/colors";
import { shadow, glassMorphism, createGradientBackground } from "../theme/styles";

export default function ConnectByCode({ navigation }) {
  const user = auth.currentUser;
  const [pressAnim] = useState(new Animated.Value(1));
  const [myCode, setMyCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const loadMyCode = async () => {
      try {
        console.log("Loading user code for:", user.uid);
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
          setMyCode(uDoc.data()?.code || "");
          console.log("User code loaded:", uDoc.data()?.code);
        } else {
          console.log("User document not found");
          Alert.alert("Error", "User profile not found. Please try logging in again.");
        }
      } catch (e) {
        console.error("Error loading code:", e);
        Alert.alert("Error", "Failed to load your profile. Please check your connection.");
      }
    };
    if (user) loadMyCode();
  }, [user]);

  const animatePress = (callback) => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(callback);
  };

  const connectWithCode = async () => {
    if (connecting) return;
    
    try {
      if (!inputCode.trim()) {
        Alert.alert("Enter Code", "Please enter a code to connect.");
        return;
      }

      if (inputCode.trim().toUpperCase() === myCode) {
        Alert.alert("Invalid Code", "You cannot connect with your own code.");
        return;
      }

      setConnecting(true);
      console.log("Connecting with code:", inputCode);

      // Search for users with the entered code
      const q = query(collection(db, "users"), where("code", "==", inputCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      
      console.log("Query results:", snap.size, "users found");
      
      const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      const otherUsers = users.filter((u) => u.uid !== user.uid);
      
      if (!otherUsers.length) {
        Alert.alert("User Not Found", "No user found with this code. Please check the code and try again.");
        return;
      }

      const otherUser = otherUsers[0];
      console.log("Found user to connect with:", otherUser.name, otherUser.uid);

      // Create deterministic pair ID
      const pairId = [user.uid, otherUser.uid].sort().join("_");
      console.log("Creating pair with ID:", pairId);

      // Check if pair already exists
      const pairDoc = await getDoc(doc(db, "pairs", pairId));
      if (pairDoc.exists()) {
        Alert.alert("Already Connected", `You are already connected with ${otherUser.name}! You can start chatting now.`);
        navigation.navigate("Chat");
        return;
      }

      // Create new pair
      await setDoc(doc(db, "pairs", pairId), {
        users: [user.uid, otherUser.uid],
        userNames: {
          [user.uid]: user.displayName || "You",
          [otherUser.uid]: otherUser.name
        },
        code: inputCode.trim().toUpperCase(),
        createdAt: Date.now(),
        lastActivity: Date.now()
      });

      console.log("Pair created successfully");
      
      Alert.alert(
        "Connected Successfully! 🎉", 
        `You are now connected with ${otherUser.name} from ${otherUser.place}!\n\nYou can now start chatting and playing games together.`,
        [
          { 
            text: "Start Chatting", 
            onPress: () => navigation.navigate("Chat")
          },
          { 
            text: "OK" 
          }
        ]
      );
      
      setInputCode("");
      
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert(
        "Connection Failed", 
        error.code === 'permission-denied' 
          ? "Database permission denied. Please check Firestore rules."
          : "Could not connect. Please check your internet connection and try again."
      );
    } finally {
      setConnecting(false);
    }
  };

  const copyToClipboard = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert(
      "Copy Code", 
      `Your code "${myCode}" is ready to share!\n\nTell your friends to enter this code to connect with you.`,
      [{ text: "OK" }]
    );
  };

  const generateNewCode = async () => {
    try {
      setLoading(true);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newCode = '';
      for (let i = 0; i < 6; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Update user's code in Firestore
      await setDoc(doc(db, "users", user.uid), {
        code: newCode
      }, { merge: true });
      
      setMyCode(newCode);
      Alert.alert("New Code Generated", `Your new connect code is: ${newCode}`);
    } catch (error) {
      console.error("Error generating code:", error);
      Alert.alert("Error", "Failed to generate new code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect by Code</Text>
          <Text style={styles.subtitle}>Share your code or enter someone else&apos;s</Text>
        </View>

        <View style={[styles.card, shadow.card3D, glassMorphism.container]}>
          {/* Your Code Section */}
          <View style={styles.codeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Connect Code</Text>
              <TouchableOpacity onPress={generateNewCode} disabled={loading}>
                <Text style={styles.generateText}>
                  {loading ? "🔄" : "🔄 New"}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={copyToClipboard}>
              <View style={[styles.codeDisplay, shadow.glow]}>
                <Text style={styles.codeText}>{myCode || "Loading..."}</Text>
                <Text style={styles.tapHint}>Tap to copy</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.codeHint}>
              Share this code with friends so they can connect with you
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Connect Section */}
          <View style={styles.connectSection}>
            <Text style={styles.sectionTitle}>Enter Friend&apos;s Code</Text>
            <TextInput
              style={[styles.input, shadow.soft]}
              placeholder="Enter your friend's code..."
              placeholderTextColor={colors.textDim}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              editable={!connecting}
            />
            
            <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
              <TouchableOpacity 
                style={[
                  styles.connectBtn, 
                  shadow.glow, 
                  createGradientBackground(colors.primary, colors.accent),
                  connecting && styles.disabledBtn
                ]}
                onPress={() => animatePress(connectWithCode)}
                disabled={connecting}
              >
                {connecting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.text} />
                    <Text style={styles.connectText}>Connecting...</Text>
                  </View>
                ) : (
                  <Text style={styles.connectText}>🔗 Connect Now</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipSection}>
            <Text style={styles.tipTitle}>💡 How it works:</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipText}>Share your unique code with friends</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipText}>Enter their code here to connect</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipText}>Start chatting and playing games together instantly!</Text>
            </View>
          </View>
        </View>

        {/* Recent Connections */}
        <View style={[styles.recentCard, shadow.card, glassMorphism.container]}>
          <Text style={styles.recentTitle}>Your Connections</Text>
          <Text style={styles.recentText}>
            Once you connect with someone, they will appear here. Start by sharing your code with a friend!
          </Text>
          <TouchableOpacity 
            style={[styles.chatBtn, shadow.soft]}
            onPress={() => navigation.navigate("Chat")}
          >
            <Text style={styles.chatBtnText}>💬 Open Chat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bg 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: 16,
    paddingBottom: 30
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: colors.text, 
    marginBottom: 8,
    textShadowColor: colors.shadowGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  subtitle: { 
    fontSize: 14, 
    color: colors.textDim, 
    textAlign: 'center' 
  },
  card: { 
    borderRadius: 25, 
    padding: 24,
    marginBottom: 20
  },
  codeSection: { 
    marginBottom: 20 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: { 
    color: colors.text, 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 12
  },
  generateText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600'
  },
  codeDisplay: {
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  codeText: { 
    color: colors.accent, 
    fontSize: 28, 
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8
  },
  tapHint: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600'
  },
  codeHint: { 
    color: colors.textDim, 
    fontSize: 12, 
    textAlign: 'center',
    lineHeight: 16
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  connectSection: { 
    marginBottom: 24 
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  connectBtn: { 
    borderRadius: 20, 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  connectText: { 
    color: colors.text, 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  disabledBtn: {
    opacity: 0.7
  },
  tipSection: { 
    backgroundColor: 'rgba(0, 255, 255, 0.1)', 
    borderRadius: 15, 
    padding: 16 
  },
  tipTitle: { 
    color: colors.accent, 
    fontWeight: 'bold', 
    marginBottom: 12,
    fontSize: 16
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  tipNumber: {
    color: colors.primary,
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 14
  },
  tipText: { 
    color: colors.textDim, 
    fontSize: 12,
    flex: 1,
    lineHeight: 16
  },
  recentCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center'
  },
  recentTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  recentText: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16
  },
  chatBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  chatBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14
  }
});