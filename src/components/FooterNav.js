import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import colors from "../theme/colors";
import { shadow, createGradientBackground } from "../theme/styles";

export default function FooterNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const [pressAnim] = useState(new Animated.Value(1));

  const navItems = [
    { key: 'Chat', label: 'Chat', icon: '💬', screen: 'Chat' },
    { key: 'Games', label: 'Games', icon: '🎮', screen: 'Games' },
    { key: 'Requests', label: 'Requests', icon: '📨', screen: 'Requests' },
    { key: 'ConnectByCode', label: 'Connect', icon: '🔗', screen: 'ConnectByCode' },
    { key: 'Profile', label: 'Profile', icon: '👤', screen: 'Profile' },
  ];

  const animatePress = (callback) => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(callback);
  };

  const NavButton = ({ item }) => {
    const isActive = route.name === item.screen;
    
    return (
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <TouchableOpacity
          style={[
            styles.navButton,
            isActive && styles.activeNavButton,
            isActive && createGradientBackground(colors.primary, colors.accent)
          ]}
          onPress={() => animatePress(() => navigation.navigate(item.screen))}
        >
          <Text style={[styles.navIcon, isActive && styles.activeNavIcon]}>
            {item.icon}
          </Text>
          <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.footer, shadow.card]}>
      {navItems.map((item) => (
        <NavButton key={item.key} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.border,
    borderRightColor: colors.border,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 15,
    minWidth: 60,
  },
  activeNavButton: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.8,
  },
  activeNavIcon: {
    opacity: 1,
  },
  navLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  activeNavLabel: {
    color: colors.text,
    fontWeight: 'bold',
  },
});