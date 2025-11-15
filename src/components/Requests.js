import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Animated, Alert, ActivityIndicator } from "react-native";
import { auth, db } from "../firebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import FooterNav from "./FooterNav";

export default function Requests({ navigation }) {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeTab, setActiveTab] = useState("received");
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({});
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to received requests
    const receivedQuery = query(
      collection(db, "requests"),
      where("toUserId", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsubscribeReceived = onSnapshot(receivedQuery, async (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReceivedRequests(requests);
      
      // Fetch detailed user information for received requests
      for (let request of requests) {
        await fetchUserDetails(request.fromUserId);
      }
    });

    // Subscribe to sent requests
    const sentQuery = query(
      collection(db, "requests"),
      where("fromUserId", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsubscribeSent = onSnapshot(sentQuery, async (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSentRequests(requests);
      
      // Fetch detailed user information for sent requests
      for (let request of requests) {
        await fetchUserDetails(request.toUserId);
      }
    });

    // Subscribe to connections
    const connectionsQuery = query(
      collection(db, "pairs"),
      where("users", "array-contains", currentUser.uid)
    );

    const unsubscribeConnections = onSnapshot(connectionsQuery, async (snapshot) => {
      const conns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConnections(conns);
      
      // Fetch detailed user information for connections
      for (let connection of conns) {
        const otherUserId = connection.users.find(uid => uid !== currentUser.uid);
        await fetchUserDetails(otherUserId);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
      unsubscribeConnections();
    };
  }, [currentUser]);

  const fetchUserDetails = async (userId) => {
    try {
      if (userDetails[userId]) return; // Already fetched
      
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserDetails(prev => ({
          ...prev,
          [userId]: {
            name: userData.name,
            place: userData.place,
            gender: userData.gender,
            age: userData.age,
            email: userData.email
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const acceptRequest = async (request) => {
    try {
      // Get user details for the pair
      const fromUserDetails = userDetails[request.fromUserId] || {};
      
      // Update request status
      await updateDoc(doc(db, "requests", request.id), {
        status: "accepted",
        acceptedAt: Date.now()
      });

      // Create connection pair
      const pairId = [currentUser.uid, request.fromUserId].sort().join("_");
      await setDoc(doc(db, "pairs", pairId), {
        users: [currentUser.uid, request.fromUserId],
        userNames: [currentUser.displayName || "User", fromUserDetails.name || request.fromUserName],
        userPlaces: ["Your Place", fromUserDetails.place || request.fromUserPlace],
        userGenders: ["Your Gender", fromUserDetails.gender || "Unknown"],
        createdAt: Date.now(),
        connectedAt: Date.now()
      });

      Alert.alert(
        "Request Accepted", 
        `You are now connected with ${fromUserDetails.name || request.fromUserName}!`
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request. Please try again.");
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "declined",
        declinedAt: Date.now()
      });
      Alert.alert("Request Declined", "Request has been declined.");
    } catch (error) {
      console.error("Error declining request:", error);
      Alert.alert("Error", "Failed to decline request. Please try again.");
    }
  };

  const cancelSentRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "requests", requestId));
      Alert.alert("Request Cancelled", "Your connection request has been cancelled.");
    } catch (error) {
      console.error("Error cancelling request:", error);
      Alert.alert("Error", "Failed to cancel request. Please try again.");
    }
  };

  const disconnectUser = async (connection) => {
    try {
      Alert.alert(
        "Disconnect",
        "Are you sure you want to disconnect from this user?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Disconnect", 
            style: "destructive",
            onPress: async () => {
              // Delete the pair/connection
              await deleteDoc(doc(db, "pairs", connection.id));
              Alert.alert("Disconnected", "You have been disconnected from this user.");
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error disconnecting:", error);
      Alert.alert("Error", "Failed to disconnect. Please try again.");
    }
  };

  const RequestCard = ({ request, type }) => {
    const [fadeAnim] = useState(new Animated.Value(0));
    
    React.useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, []);

    const getTimeAgo = (timestamp) => {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return "Just now";
    };

    const userId = type === "received" ? request.fromUserId : request.toUserId;
    const userDetail = userDetails[userId] || {};

    return (
      <Animated.View style={[styles.requestCard, { opacity: fadeAnim }]}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {userDetail.name || (type === "received" ? request.fromUserName : request.toUserName)}
            </Text>
            <View style={styles.userDetailsRow}>
              <Text style={styles.userDetail}>📍 {userDetail.place || (type === "received" ? request.fromUserPlace : request.toUserPlace)}</Text>
              <Text style={styles.userDetail}>👤 {userDetail.gender ? userDetail.gender.charAt(0).toUpperCase() + userDetail.gender.slice(1) : "Unknown"}</Text>
              {userDetail.age && <Text style={styles.userDetail}>🎂 {userDetail.age} years</Text>}
            </View>
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(request.createdAt)}</Text>
        </View>
        
        <Text style={styles.requestMessage}>
          {type === "received" 
            ? `${userDetail.name || request.fromUserName} wants to connect with you` 
            : `You sent a connection request to ${userDetail.name || request.toUserName}`
          }
        </Text>
        
        <View style={styles.actionButtons}>
          {type === "received" ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => acceptRequest(request)}
              >
                <Text style={styles.buttonText}>✓ Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => declineRequest(request.id)}
              >
                <Text style={[styles.buttonText, styles.declineText]}>✗ Decline</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => cancelSentRequest(request.id)}
            >
              <Text style={styles.buttonText}>🗑️ Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const ConnectionCard = ({ connection }) => {
    const otherUserId = connection.users.find(uid => uid !== currentUser.uid);
    const otherUserDetail = userDetails[otherUserId] || {};
    const otherUserName = otherUserDetail.name || connection.userNames?.[1] || "Unknown User";

    return (
      <View style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName}>🔗 {otherUserName}</Text>
            <View style={styles.connectionDetails}>
              <Text style={styles.connectionDetail}>📍 {otherUserDetail.place || "Unknown Place"}</Text>
              <Text style={styles.connectionDetail}>👤 {otherUserDetail.gender ? otherUserDetail.gender.charAt(0).toUpperCase() + otherUserDetail.gender.slice(1) : "Unknown"}</Text>
              {otherUserDetail.age && <Text style={styles.connectionDetail}>🎂 {otherUserDetail.age} years</Text>}
            </View>
          </View>
          <Text style={styles.connectionTime}>
            {new Date(connection.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.connectionActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => navigation.navigate("Chat")}
          >
            <Text style={styles.buttonText}>💬 Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.gameButton]}
            onPress={() => navigation.navigate("Games")}
          >
            <Text style={styles.buttonText}>🎮 Games</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={() => disconnectUser(connection)}
          >
            <Text style={[styles.buttonText, styles.disconnectText]}>🚫 Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TabButton = ({ title, value, isActive }) => (
    <TouchableOpacity 
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={() => setActiveTab(value)}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading your requests...</Text>
    </View>
  );

  const EmptyState = ({ emoji, title, message }) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connection Requests</Text>
        <Text style={styles.subtitle}>Manage your connections and requests</Text>
      </View>

      <View style={styles.tabContainer}>
        <TabButton title="Received" value="received" isActive={activeTab === "received"} />
        <TabButton title="Sent" value="sent" isActive={activeTab === "sent"} />
        <TabButton title="Connections" value="connections" isActive={activeTab === "connections"} />
      </View>

      {loading ? (
        <LoadingState />
      ) : activeTab === "received" ? (
        receivedRequests.length === 0 ? (
          <EmptyState 
            emoji="📭"
            title="No Received Requests"
            message="When someone sends you a connection request, it will appear here."
          />
        ) : (
          <FlatList
            data={receivedRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RequestCard request={item} type="received" />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : activeTab === "sent" ? (
        sentRequests.length === 0 ? (
          <EmptyState 
            emoji="📤"
            title="No Sent Requests"
            message="Your sent connection requests will appear here."
          />
        ) : (
          <FlatList
            data={sentRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RequestCard request={item} type="sent" />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        connections.length === 0 ? (
          <EmptyState 
            emoji="🔗"
            title="No Connections Yet"
            message="Accept connection requests to start chatting and playing games with others!"
          />
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConnectionCard connection={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{receivedRequests.length}</Text>
          <Text style={styles.statLabel}>Received</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{sentRequests.length}</Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{connections.length}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
      </View>

      <FooterNav navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA",
    paddingBottom: 70,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  tabTextActive: {
    color: "white",
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  connectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  connectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  connectionInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 6,
  },
  connectionName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  userDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  connectionDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userDetail: {
    fontSize: 12,
    color: "#8E8E93",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  connectionDetail: {
    fontSize: 12,
    color: "#8E8E93",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeAgo: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  connectionTime: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  requestMessage: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  connectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#34C759",
  },
  declineButton: {
    backgroundColor: "#FF3B30",
  },
  cancelButton: {
    backgroundColor: "#FF9500",
  },
  chatButton: {
    backgroundColor: "#007AFF",
  },
  gameButton: {
    backgroundColor: "#5856D6",
  },
  disconnectButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  declineText: {
    color: "white",
  },
  disconnectText: {
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
});