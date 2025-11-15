import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Animated, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform 
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function Profile({ navigation }) {
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [statsAnim] = useState(new Animated.Value(0));
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    place: "",
    age: "",
    gender: ""
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const uDoc = await getDoc(doc(db, "users", user.uid));
      if (uDoc.exists()) {
        const userData = uDoc.data();
        setProfile(userData);
        setEditForm({
          name: userData.name || "",
          place: userData.place || "",
          age: userData.age || "",
          gender: userData.gender || ""
        });
        
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(statsAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
      }
    } catch (e) {
      console.log("[Profile error]", e.code, e.message);
      Alert.alert("Error", "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      if (!editForm.name.trim()) {
        Alert.alert("Error", "Name is required");
        return;
      }

      if (!editForm.place.trim()) {
        Alert.alert("Error", "Place is required");
        return;
      }

      if (!editForm.age || isNaN(editForm.age) || parseInt(editForm.age) < 1 || parseInt(editForm.age) > 120) {
        Alert.alert("Error", "Please enter a valid age (1-120)");
        return;
      }

      if (!editForm.gender) {
        Alert.alert("Error", "Please select gender");
        return;
      }

      const updatedData = {
        name: editForm.name.trim(),
        place: editForm.place.trim(),
        age: parseInt(editForm.age),
        gender: editForm.gender,
        updatedAt: Date.now()
      };

      await updateDoc(doc(db, "users", user.uid), updatedData);
      
      // Update local state
      setProfile(prev => ({ ...prev, ...updatedData }));
      
      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
      
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleShareCode = () => {
    if (profile?.code) {
      Alert.alert(
        "Share Your Code",
        `Your connect code is: ${profile.code}\n\nShare this code with friends so they can connect with you!`,
        [
          { text: "Copy Code", onPress: () => console.log("Code copied:", profile.code) },
          { text: "OK" }
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            auth.signOut();
            navigation.replace("Login");
          }
        }
      ]
    );
  };

  const InfoCard = ({ icon, label, value, color = "#007AFF" }) => (
    <Animated.View 
      style={[
        styles.infoCard, 
        { opacity: fadeAnim }
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.infoIconText}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color }]}>{value}</Text>
      </View>
    </Animated.View>
  );

  const StatCard = ({ title, value, subtitle, delay = 0 }) => (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          opacity: statsAnim,
          transform: [
            { 
              translateY: statsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }
          ]
        }
      ]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </Animated.View>
  );

  const EditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Place</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.place}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, place: text }))}
              placeholder="Enter your city"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.age.toString()}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, age: text }))}
              placeholder="Enter your age"
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  editForm.gender === 'male' && styles.genderButtonSelected
                ]}
                onPress={() => setEditForm(prev => ({ ...prev, gender: 'male' }))}
              >
                <Text style={[
                  styles.genderButtonText,
                  editForm.gender === 'male' && styles.genderButtonTextSelected
                ]}>
                  👨 Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  editForm.gender === 'female' && styles.genderButtonSelected
                ]}
                onPress={() => setEditForm(prev => ({ ...prev, gender: 'female' }))}
              >
                <Text style={[
                  styles.genderButtonText,
                  editForm.gender === 'female' && styles.genderButtonTextSelected
                ]}>
                  👩 Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Loading your information...</Text>
        </View>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>🔄 Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Unable to load profile</Text>
        </View>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>😔</Text>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>We couldn&apos;t load your profile information.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
            <Text style={styles.retryText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getJoinDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Your account overview</Text>
        </View>

        <Animated.View 
          style={[
            styles.profileCard, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, styles.avatarGradient]}>
              <Text style={styles.avatarText}>
                {getInitials(profile.name)}
              </Text>
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.userName}>{profile.name}</Text>
              <Text style={styles.userEmail}>{profile.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {profile.gender === 'male' ? '👨' : '👩'} {profile.gender?.charAt(0).toUpperCase() + profile.gender?.slice(1)} • {profile.age || 'N/A'} years
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.codeSection]} 
            onPress={handleShareCode}
          >
            <View style={styles.codeHeader}>
              <Text style={styles.codeLabel}>Your Connect Code</Text>
              <Text style={styles.shareText}>Tap to share ↗</Text>
            </View>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{profile.code}</Text>
            </View>
            <Text style={styles.codeHint}>
              Share this code with friends to connect with you
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]}
              onPress={handleEditProfile}
            >
              <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.shareBtn]}
              onPress={handleShareCode}
            >
              <Text style={styles.shareBtnText}>🔗 Share Code</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoCard 
            icon="📍" 
            label="Location" 
            value={profile.place} 
            color="#5856D6"
          />
          <InfoCard 
            icon="🎂" 
            label="Age" 
            value={profile.age ? `${profile.age} years` : "Not specified"} 
            color="#FF9500"
          />
          <InfoCard 
            icon="🎯" 
            label="Connect Code" 
            value={profile.code} 
            color="#007AFF"
          />
          <InfoCard 
            icon="📅" 
            label="Member Since" 
            value={getJoinDate(profile.createdAt)} 
            color="#34C759"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              title="Connections" 
              value="0" 
              subtitle="Friends"
            />
            <StatCard 
              title="Messages" 
              value="0" 
              subtitle="Sent"
            />
            <StatCard 
              title="Games" 
              value="0" 
              subtitle="Played"
            />
            <StatCard 
              title="Level" 
              value="1" 
              subtitle="Beginner"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickAction]}
              onPress={() => navigation.navigate('ConnectByCode')}
            >
              <Text style={styles.quickActionIcon}>🔗</Text>
              <Text style={styles.quickActionText}>Connect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAction]}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAction]}
              onPress={() => navigation.navigate('Games')}
            >
              <Text style={styles.quickActionIcon}>🎮</Text>
              <Text style={styles.quickActionText}>Games</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAction]}
              onPress={handleLogout}
            >
              <Text style={styles.quickActionIcon}>🚪</Text>
              <Text style={styles.quickActionText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Social Connect v1.0 • Made with ❤️
          </Text>
        </View>
      </ScrollView>

      <EditModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarGradient: {
    backgroundColor: "#007AFF",
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  nameSection: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  codeSection: {
    backgroundColor: "#F2F2F7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  shareText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  codeDisplay: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#F2F2F7",
  },
  shareBtn: {
    backgroundColor: "#007AFF",
  },
  editBtnText: {
    color: "#1C1C1E",
    fontWeight: "600",
    fontSize: 16,
  },
  shareBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoIconText: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    minWidth: '45%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  genderButtonTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});