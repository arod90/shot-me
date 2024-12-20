// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  AppState,
} from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { addHours, subHours, isWithinInterval } from 'date-fns';

const TabIcon = ({ color, size, isCheckedIn, pulseAnim }) => (
  <View style={styles.iconContainer}>
    {isCheckedIn ? (
      <>
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
      </>
    ) : (
      <Ionicons name="moon" size={size} color={color} />
    )}
  </View>
);

export default function TabLayout() {
  const { userId } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  const checkUserCheckedIn = async () => {
    if (!userId) {
      console.log('No userId found');
      return;
    }

    try {
      // Get Supabase user ID from Clerk ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      console.log('Found user data:', userData);

      // Get all checkins for this user
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkins')
        .select(
          `
          *,
          events (*)
        `
        )
        .eq('user_id', userData.id)
        .order('checked_in_at', { ascending: false });

      console.log('Found checkins:', checkins);

      if (checkinsError) {
        console.error('Error fetching checkins:', checkinsError);
        return;
      }

      if (checkins && checkins.length > 0) {
        // Look at each checkin
        for (const checkin of checkins) {
          const eventDate = new Date(checkin.events.event_date);
          const now = new Date();
          const eventWindow = {
            start: subHours(eventDate, 36), // More lenient for testing
            end: addHours(eventDate, 36),
          };

          console.log('Checking event window:', {
            eventName: checkin.events.event_name,
            eventDate: eventDate.toISOString(),
            windowStart: eventWindow.start.toISOString(),
            windowEnd: eventWindow.end.toISOString(),
            currentTime: now.toISOString(),
            isWithinInterval: isWithinInterval(now, eventWindow),
          });

          if (isWithinInterval(now, eventWindow)) {
            console.log('Found valid check-in:', checkin);
            setIsCheckedIn(true);
            return;
          }
        }
      }

      console.log('No valid checkins found within time window');
      setIsCheckedIn(false);
    } catch (error) {
      console.error('Error in checkUserCheckedIn:', error);
      setIsCheckedIn(false);
    }
  };

  // Animation effect for pulse
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
    }
  }, [isCheckedIn]);

  useEffect(() => {
    // Initial check
    checkUserCheckedIn();

    // Set up real-time subscription for check-ins
    const checkinsChannel = supabase
      .channel('checkins-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkins',
        },
        (payload) => {
          console.log('Checkin detected:', payload);
          checkUserCheckedIn();
        }
      )
      .subscribe();

    // Set up real-time subscription for userevents updates
    const usereventsChannel = supabase
      .channel('userevents-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'userevents',
        },
        (payload) => {
          console.log('Userevent update detected:', payload);
          checkUserCheckedIn();
        }
      )
      .subscribe();

    // Add AppState listener for foreground checks
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkUserCheckedIn();
      }
    });

    return () => {
      checkinsChannel.unsubscribe();
      usereventsChannel.unsubscribe();
      subscription.remove();
    };
  }, [userId]);

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
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              color={color}
              size={size}
              isCheckedIn={isCheckedIn}
              pulseAnim={pulseAnim}
            />
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
