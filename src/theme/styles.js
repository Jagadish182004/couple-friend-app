import { StyleSheet } from "react-native";
import colors from "./colors";

export const shadow = StyleSheet.create({
  card3D: {
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  soft: {
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  }
});

export const createGradientBackground = (startColor, endColor) => {
  return {
    backgroundColor: startColor,
    borderColor: endColor,
  };
};

export const glassMorphism = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(40, 45, 70, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
});