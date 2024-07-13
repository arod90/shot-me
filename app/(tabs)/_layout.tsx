import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          height: Platform.OS === 'ios' ? 90 : 70, // Increased height, especially for iOS
          paddingBottom: Platform.OS === 'ios' ? 30 : 10, // More padding at the bottom for iOS
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FF5252',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontFamily: 'Oswald_400Regular',
          fontSize: 12,
          marginBottom: Platform.OS === 'ios' ? 0 : 5, // Adjust label position
        },
        tabBarIconStyle: {
          marginTop: 5, // Adjust icon position
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
