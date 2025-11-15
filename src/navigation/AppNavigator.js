import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Dashboard from "../components/Dashboard";
import Chat from "../components/Chat";
import Games from "../components/Games";
import Requests from "../components/Requests";
import ConnectByCode from "../components/ConnectByCode";
import Profile from "../components/Profile";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Dashboard" 
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0a0e1a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Dashboard" component={Dashboard} options={{ title: "Dashboard" }} />
      <Stack.Screen name="Chat" component={Chat} options={{ title: "Chat" }} />
      <Stack.Screen name="Games" component={Games} options={{ title: "Games" }} />
      <Stack.Screen name="Requests" component={Requests} options={{ title: "Requests" }} />
      <Stack.Screen name="ConnectByCode" component={ConnectByCode} options={{ title: "Connect by code" }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: "Profile" }} />
    </Stack.Navigator>
  );
}