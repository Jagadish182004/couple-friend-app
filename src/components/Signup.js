import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Animated, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import colors from "../theme/colors";
import { shadow, glassMorphism, createGradientBackground } from "../theme/styles";

export default function Signup({ navigation }) {
  const [pressAnim] = useState(new Animated.Value(1));
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [gender, setGender] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const animatePress = (callback) => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(callback);
  };

  const showSuccessNotification = (message) => {
    Alert.alert("🎉 Success!", message, [{ text: "OK" }]);
  };

  const showErrorNotification = (title, message) => {
    Alert.alert(`❌ ${title}`, message, [{ text: "OK" }]);
  };

  const getAuthErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Please use a different email or login.',
      'auth/invalid-email': 'The email address is not valid. Please check your email.',
      'auth/operation-not-allowed': 'Email/password sign-up is not enabled. Please contact support.',
      'auth/weak-password': 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
      'permission-denied': 'Database permission denied. Please try again or contact support.',
      'not-found': 'Database not found. Please check your Firebase configuration.',
      'default': 'An unexpected error occurred. Please try again.'
    };

    return errorMessages[errorCode] || errorMessages.default;
  };

  const validateForm = () => {
    if (!name.trim() || !place.trim() || !gender || !code.trim() || !email.trim() || !password || !confirmPassword) {
      showErrorNotification("Missing Information", "Please fill in all fields to continue.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showErrorNotification("Invalid Email", "Please enter a valid email address.");
      return false;
    }

    if (password.length < 6) {
      showErrorNotification("Weak Password", "Password must be at least 6 characters long.");
      return false;
    }

    if (password !== confirmPassword) {
      showErrorNotification("Password Mismatch", "Passwords do not match. Please check and try again.");
      return false;
    }

    if (code.trim().length < 3) {
      showErrorNotification("Invalid Code", "Connect code must be at least 3 characters long.");
      return false;
    }

    return true;
  };

  const checkCodeAvailability = async (userCode) => {
    try {
      const q = query(collection(db, "users"), where("code", "==", userCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error("Error checking code availability:", error);
      return true;
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const onSignup = async () => {
    if (loading) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log("🚀 Starting signup process for:", email);

      const formattedCode = code.trim().toUpperCase();
      const isCodeAvailable = await checkCodeAvailability(formattedCode);
      
      if (!isCodeAvailable) {
        showErrorNotification(
          "Code Already Taken", 
          `The code "${formattedCode}" is already in use. Please choose a different code or try: ${generateRandomCode()}`
        );
        return;
      }

      animatePress(async () => {
        console.log("🔐 Creating user in Firebase Auth...");
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const user = userCredential.user;
        
        console.log("✅ Auth user created:", user.uid);

        const userData = {
          uid: user.uid,
          name: name.trim(),
          place: place.trim(),
          gender: gender,
          code: formattedCode,
          email: email.trim().toLowerCase(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        console.log("💾 Saving user data to Firestore:", userData);
        await setDoc(doc(db, "users", user.uid), userData);
        
        console.log("✅ User document created successfully");

        showSuccessNotification(
          `Welcome to Social Connect, ${name}! 🎉\n\nYour account has been created successfully.\n\nYour connect code: ${formattedCode}\n\nShare this code with friends to connect!`
        );

        setTimeout(() => {
          navigation.replace("Main", { screen: "Dashboard" });
        }, 3000);

      });

    } catch (error) {
      console.error("❌ Signup error:", error.code, error.message);
      
      const errorTitle = "Signup Failed";
      const errorMessage = getAuthErrorMessage(error.code);
      
      showErrorNotification(errorTitle, errorMessage);
      
      setPassword("");
      setConfirmPassword("");
      
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const newCode = generateRandomCode();
    setCode(newCode);
    showSuccessNotification(`New code generated: ${newCode}`);
  };

  const GenderButton = ({ title, value, selected }) => (
    <TouchableOpacity onPress={() => setGender(value)} disabled={loading}>
      <View style={[
        styles.genderBtn, 
        selected && styles.genderSelected,
        selected && createGradientBackground(colors.primary, colors.accent),
        loading && styles.disabled
      ]}>
        <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Join Our Community! 🌟</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>
        </View>

        <View style={[styles.card, shadow.card3D, glassMorphism.container]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput 
                style={[styles.input, shadow.soft, loading && styles.disabledInput]} 
                placeholder="Enter your full name"
                placeholderTextColor={colors.textDim}
                value={name} 
                onChangeText={setName}
                editable={!loading}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>City/Location *</Text>
              <TextInput 
                style={[styles.input, shadow.soft, loading && styles.disabledInput]} 
                placeholder="Where are you from?"
                placeholderTextColor={colors.textDim}
                value={place} 
                onChangeText={setPlace}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender *</Text>
              <View style={styles.genderRow}>
                <GenderButton title="👨 Male" value="male" selected={gender === "male"} />
                <GenderButton title="👩 Female" value="female" selected={gender === "female"} />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connect Code</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Unique Code *</Text>
              <View style={styles.codeContainer}>
                <TextInput 
                  style={[styles.input, styles.codeInput, shadow.soft, loading && styles.disabledInput]} 
                  placeholder="e.g., FRIEND123"
                  placeholderTextColor={colors.textDim}
                  value={code} 
                  onChangeText={setCode}
                  editable={!loading}
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <TouchableOpacity 
                  style={[styles.generateBtn, shadow.soft]} 
                  onPress={handleGenerateCode}
                  disabled={loading}
                >
                  <Text style={styles.generateText}>🎲 Generate</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeHint}>
                This code will be used by friends to connect with you
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Security</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput 
                style={[styles.input, shadow.soft, loading && styles.disabledInput]} 
                placeholder="your@email.com"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email} 
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput 
                style={[styles.input, shadow.soft, loading && styles.disabledInput]} 
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textDim}
                secureTextEntry 
                value={password} 
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <TextInput 
                style={[styles.input, shadow.soft, loading && styles.disabledInput]} 
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textDim}
                secureTextEntry 
                value={confirmPassword} 
                onChangeText={setConfirmPassword}
                editable={!loading}
                onSubmitEditing={onSignup}
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
            <TouchableOpacity 
              onPress={onSignup}
              disabled={loading}
              style={[loading && styles.disabled]}
            >
              <View style={[styles.primaryBtn, shadow.glow, createGradientBackground(colors.primary, colors.accent)]}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.text} />
                    <Text style={styles.primaryText}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryText}>Create My Account</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* FIXED NAVIGATION - Using navigate instead of goBack */}
          <TouchableOpacity 
            onPress={() => navigation.navigate("Login")} 
            style={[styles.linkBtn, loading && styles.disabled]}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlight}>Sign in here</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bg 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: 20,
    paddingVertical: 30
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: colors.text, 
    marginBottom: 8,
    textShadowColor: colors.shadowGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.textDim,
    textAlign: 'center'
  },
  card: { 
    borderRadius: 25, 
    padding: 25, 
    marginBottom: 20 
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 10
  },
  genderBtn: { 
    flex: 1, 
    borderRadius: 12, 
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  genderSelected: { 
    borderColor: colors.accent 
  },
  genderText: { 
    color: colors.text, 
    fontWeight: '600', 
    fontSize: 14 
  },
  genderTextSelected: { 
    color: colors.text, 
    fontWeight: 'bold' 
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  codeInput: {
    flex: 1
  },
  generateBtn: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border
  },
  generateText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600'
  },
  codeHint: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20
  },
  primaryBtn: { 
    borderRadius: 20, 
    paddingVertical: 18, 
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  primaryText: { 
    color: colors.text, 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  linkBtn: { 
    alignItems: 'center' 
  },
  linkText: { 
    color: colors.textDim, 
    fontSize: 14,
    textAlign: 'center'
  },
  linkHighlight: { 
    color: colors.accent, 
    fontWeight: 'bold' 
  },
  terms: {
    paddingHorizontal: 20
  },
  termsText: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16
  },
  disabled: {
    opacity: 0.6
  },
  disabledInput: {
    opacity: 0.7
  }
});