import React, { useState, useEffect } from "react";
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
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import colors from "../theme/colors";
import { shadow, glassMorphism, createGradientBackground } from "../theme/styles";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pressAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ User already logged in:", user.email);
        showSuccessNotification("Welcome back! Redirecting...");
        setTimeout(() => {
          navigation.replace("Main", { screen: "Dashboard" });
        }, 1500);
      }
    });

    return unsubscribe;
  }, [navigation]);

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
      'auth/invalid-email': 'The email address is not valid. Please check your email.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later or reset your password.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please contact support.',
      'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
      'default': 'An unexpected error occurred. Please try again.'
    };

    return errorMessages[errorCode] || errorMessages.default;
  };

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      showErrorNotification("Missing Information", "Please enter both email and password.");
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

    return true;
  };

  const onLogin = async () => {
    if (loading) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log("🔐 Attempting login with:", email);

      animatePress(async () => {
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          email.trim().toLowerCase(), 
          password
        );
        
        const user = userCredential.user;
        console.log("✅ Login successful for user:", user.email);
        
        showSuccessNotification(`Welcome back! You've successfully logged in as ${user.email}`);
        
        setTimeout(() => {
          navigation.replace("Main", { screen: "Dashboard" });
        }, 2000);
      });

    } catch (error) {
      console.error("❌ Login error:", error.code, error.message);
      
      const errorTitle = "Login Failed";
      const errorMessage = getAuthErrorMessage(error.code);
      
      showErrorNotification(errorTitle, errorMessage);
      
      setPassword("");
      
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password?",
      "Password reset feature will be added soon. Please contact support if you need assistance.",
      [{ text: "OK" }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back! 👋</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue</Text>
          </View>

          <View style={[styles.card, shadow.card3D, glassMorphism.container]}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, shadow.soft]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={[styles.input, shadow.soft]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                onSubmitEditing={onLogin}
              />
            </View>

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
              <TouchableOpacity 
                onPress={onLogin}
                disabled={loading}
                style={[loading && styles.disabled]}
              >
                <View style={[styles.primaryBtn, shadow.glow, createGradientBackground(colors.primary, colors.accent)]}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.text} />
                      <Text style={styles.primaryText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryText}>Sign In</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.divider} />
            
            {/* FIXED NAVIGATION - Using navigate to Signup */}
            <TouchableOpacity 
              onPress={() => navigation.navigate("Signup")} 
              style={[styles.linkBtn, loading && styles.disabled]}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account? <Text style={styles.linkHighlight}>Create one now</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What you can do:</Text>
            <Text style={styles.feature}>• Connect with friends using codes</Text>
            <Text style={styles.feature}>• Chat in real-time</Text>
            <Text style={styles.feature}>• Play interactive games</Text>
            <Text style={styles.feature}>• Build your social network</Text>
          </View>
        </Animated.View>
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
    justifyContent: 'center' 
  },
  content: { 
    padding: 20 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: colors.text, 
    marginBottom: 8,
    textShadowColor: colors.shadowGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.textDim,
    textAlign: 'center'
  },
  card: { 
    borderRadius: 25, 
    padding: 25, 
    marginBottom: 30 
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600'
  },
  primaryBtn: { 
    borderRadius: 20, 
    paddingVertical: 18, 
    alignItems: 'center',
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20
  },
  linkBtn: { 
    alignItems: 'center' 
  },
  linkText: { 
    color: colors.textDim, 
    fontSize: 14 
  },
  linkHighlight: { 
    color: colors.accent, 
    fontWeight: 'bold' 
  },
  features: {
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  featuresTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  feature: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 6
  },
  disabled: {
    opacity: 0.6
  }
});