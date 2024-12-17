// @ts-nocheck
'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Animated, View, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { userId } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    checkUserCheckedIn();

    // Set up real-time subscription for check-ins
    const subscription = supabase
      .channel('checkins-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
        },
        (payload) => {
          checkUserCheckedIn();
        }
      )
      .subscribe();

    // Set up real-time subscription for userevents updates
    const usereventsSubscription = supabase
      .channel('userevents-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'userevents',
        },
        (payload) => {
          checkUserCheckedIn();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      usereventsSubscription.unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (isCheckedIn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Navigate to tonight tab when checked in
      router.replace('/(tabs)/tonight');
    }
  }, [isCheckedIn]);

  const checkUserCheckedIn = async () => {
    if (!userId) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      if (userData) {
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

        const { data: checkin } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', userData.id)
          .gte('checked_in_at', twelveHoursAgo.toISOString())
          .order('checked_in_at', { ascending: false })
          .limit(1)
          .single();

        if (checkin) {
          console.log('Found active check-in:', checkin);
          setIsCheckedIn(true);
        } else {
          console.log('No active check-in found');
          setIsCheckedIn(false);
        }
      }
    } catch (error) {
      console.error('Error checking user check-in:', error);
      setIsCheckedIn(false);
    }
  };

  const TabIcon = ({ color, size }) => (
    <View style={styles.iconContainer}>
      <Ionicons name="flame" size={size} color={color} />
      <View style={styles.dot} />
      <Animated.View
        style={[
          styles.pulseDot,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 2],
              outputRange: [1, 0],
            }),
          },
        ]}
      />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FF5252',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontFamily: 'Oswald_400Regular',
          fontSize: 12,
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: true,
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
        name="tonight"
        options={{
          title: 'Tonight',
          tabBarIcon: ({ color, size }) =>
            isCheckedIn ? (
              <TabIcon color={color} size={size} />
            ) : (
              <Ionicons name="moon" size={size} color={color} />
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

const styles = StyleSheet.create({
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#fe6847',
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#fe6847',
  },
});
