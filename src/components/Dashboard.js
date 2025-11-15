import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Alert } from "react-native";
import { auth, db } from "../firebaseConfig";
import { collection, getDocs, query, where, doc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import FooterNav from "./FooterNav";

export default function Dashboard({ navigation }) {
  const [pressAnim] = useState(new Animated.Value(1));
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log("Loading users from Firestore...");
        const snap = await getDocs(collection(db, "users"));
        const users = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(user => user.uid !== currentUser?.uid);
        
        console.log(`Loaded ${users.length} users`);
        setAllUsers(users);
        setResults(users);
      } catch (error) {
        console.error("Error loading users:", error);
        Alert.alert("Error", "Failed to load users. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    const loadSentRequests = async () => {
      if (!currentUser) return;
      
      try {
        const requestsQuery = query(
          collection(db, "requests"),
          where("fromUserId", "==", currentUser.uid),
          where("status", "==", "pending")
        );
        const snap = await getDocs(requestsQuery);
        const requests = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSentRequests(requests);
      } catch (error) {
        console.error("Error loading sent requests:", error);
      }
    };

    if (currentUser) {
      loadUsers();
      loadSentRequests();
    }
  }, [currentUser]);

  const animatePress = (callback) => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(callback);
  };

  const searchFriends = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = allUsers.filter((user) => {
      const matchText = (user.name?.toLowerCase().includes(q) || user.place?.toLowerCase().includes(q));
      const matchGender = genderFilter ? user.gender === genderFilter : true;
      return matchText && matchGender;
    });
    setResults(filtered);
  };

  const randomFriend = () => {
    if (!allUsers.length) {
      Alert.alert("No Users", "No other users found yet.");
      return;
    }
    const idx = Math.floor(Math.random() * allUsers.length);
    setResults([allUsers[idx]]);
  };

  const sendConnectionRequest = async (toUser) => {
    if (!currentUser) return;

    try {
      // Check if request already exists
      const existingRequestQuery = query(
        collection(db, "requests"),
        where("fromUserId", "==", currentUser.uid),
        where("toUserId", "==", toUser.id),
        where("status", "==", "pending")
      );
      const existingSnap = await getDocs(existingRequestQuery);
      
      if (!existingSnap.empty) {
        Alert.alert("Request Already Sent", `You have already sent a connection request to ${toUser.name}`);
        return;
      }

      // Create new request
      const requestData = {
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || "Unknown User",
        fromUserPlace: "Unknown Place",
        toUserId: toUser.id,
        toUserName: toUser.name,
        toUserPlace: toUser.place,
        type: "connection",
        status: "pending",
        createdAt: Date.now(),
        message: `${currentUser.displayName || "Someone"} wants to connect with you`
      };

      await setDoc(doc(collection(db, "requests")), requestData);
      
      // Update local state
      setSentRequests(prev => [...prev, requestData]);
      
      Alert.alert(
        "Request Sent!",
        `Connection request sent to ${toUser.name}. They will be notified.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send connection request. Please try again.");
    }
  };

  const hasSentRequest = (userId) => {
    return sentRequests.some(request => request.toUserId === userId);
  };

  const FilterButton = ({ title, value, selected }) => (
    <TouchableOpacity onPress={() => setGenderFilter(value)}>
      <View style={[
        styles.filterBtn, 
        selected && styles.filterSelected
      ]}>
        <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Animated.View style={[styles.userCard, styles.shadow]}>
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={[
          styles.genderBadge,
          item.gender === 'male' ? styles.maleBadge : styles.femaleBadge
        ]}>
          <Text style={styles.genderText}>
            {item.gender === 'male' ? '👨 Male' : '👩 Female'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <Text style={styles.userDetail}>📍 {item.place}</Text>
        <Text style={styles.userDetail}>🎂 Age: {item.age || "Not specified"}</Text>
        <Text style={styles.userDetail}>📧 {item.email}</Text>
      </View>

      {hasSentRequest(item.id) ? (
        <View style={[styles.requestBtn, styles.requestSent]}>
          <Text style={styles.requestSentText}>Request Sent ✓</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.requestBtn, styles.shadow]}
          onPress={() => sendConnectionRequest(item)}
        >
          <Text style={styles.requestText}>Send Connection Request</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading users...</Text>
        <FooterNav navigation={navigation} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Connect</Text>
        <Text style={styles.subtitle}>
          {allUsers.length > 0 
            ? `Connect with ${allUsers.length} users` 
            : "No other users found yet"
          }
        </Text>
      </View>

      <View style={[styles.searchCard, styles.shadow]}>
        <TextInput
          style={[styles.input, styles.shadow]}
          placeholder="Search by name or place..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterRow}>
          <FilterButton title="👨 Male" value="male" selected={genderFilter === "male"} />
          <FilterButton title="👩 Female" value="female" selected={genderFilter === "female"} />
          <FilterButton title="🌎 All" value="" selected={genderFilter === ""} />
        </View>

        <View style={styles.actionRow}>
          <Animated.View style={{ transform: [{ scale: pressAnim }], flex: 1 }}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.shadow]}
              onPress={() => animatePress(searchFriends)}
            >
              <Text style={styles.actionText}>🔍 Search</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={{ transform: [{ scale: pressAnim }], flex: 1, marginLeft: 10 }}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.shadow]}
              onPress={() => animatePress(randomFriend)}
            >
              <Text style={styles.actionText}>🎲 Random</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyText}>
            {allUsers.length === 0 
              ? "No other users have signed up yet. Share the app with friends!"
              : "Try changing your search or filter criteria."
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FooterNav navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    paddingBottom: 70, 
    backgroundColor: "#f8f9fa" 
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  searchCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "white",
    fontSize: 16,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },
  filterSelected: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    color: "#666",
    fontWeight: "500",
    fontSize: 12,
  },
  filterTextSelected: {
    color: "white",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  userCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  genderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  maleBadge: {
    backgroundColor: "#e3f2fd",
  },
  femaleBadge: {
    backgroundColor: "#fce4ec",
  },
  genderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  userDetails: {
    marginBottom: 15,
  },
  userDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  requestBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  requestSent: {
    backgroundColor: "#34C759",
  },
  requestText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  requestSentText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  listContent: {
    paddingBottom: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});