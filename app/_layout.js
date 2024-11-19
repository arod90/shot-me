import React, { useState, useEffect, useRef } from 'react';
import {
  ClerkProvider,
  ClerkLoaded,
  useAuth,
  useUser,
} from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import LoadingScreen from '../components/LoadingScreen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { supabase } from '../supabase';
import {
  registerForPushNotificationsAsync,
  setupNotifications,
} from './utils/notifications';
import { useFonts, Oswald_400Regular } from '@expo-google-fonts/oswald';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto hiding of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignore errors */
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Oswald_400Regular,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for fonts to load
        if (!fontsLoaded && !fontError) {
          return;
        }

        // Hide splash screen
        await SplashScreen.hideAsync();

        // Artificial delay to show loading screen
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, [fontsLoaded, fontError]);

  // Hide loading screen after delay
  useEffect(() => {
    if (appIsReady) {
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appIsReady]);

  // Show loading screen if not ready or fonts not loaded
  if (!appIsReady || !fontsLoaded || showLoadingScreen) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={publishableKey}>
        <ClerkLoaded>
          <RootLayoutNav />
        </ClerkLoaded>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token)
    );

    const cleanup = setupNotifications((notification) => {
      setNotification(notification);
    });

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (expoPushToken && userId) {
      updateUserPushToken(userId, expoPushToken);
    }
  }, [expoPushToken, userId]);

  const updateUserPushToken = async (userId, token) => {
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

      if (!userData) {
        console.error('User not found');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userData.id);

      if (error) {
        console.error('Error updating push token:', error);
      } else {
        console.log('Push token updated successfully');
      }
    } catch (error) {
      console.error('Unexpected error in updateUserPushToken:', error);
    }
  };

  useEffect(() => {
    const setupUser = async () => {
      if (isLoaded && isSignedIn && userId && user) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

          if (userError) {
            if (userError.code === 'PGRST116') {
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  clerk_id: userId,
                  email: user.primaryEmailAddress?.emailAddress || '',
                  first_name: user.firstName || '',
                  last_name: user.lastName || '',
                })
                .select('id')
                .single();

              if (createError) {
                throw createError;
              }
            } else {
              throw userError;
            }
          }
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Error setting up user:', error);
        }
      } else if (isLoaded && !isSignedIn) {
        router.replace('/(auth)/sign-in');
      }
    };

    setupUser();
  }, [isSignedIn, isLoaded, userId, user]);

  // Show loading screen while Clerk is loading
  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'fade',
          presentation: 'card',
          gestureEnabled: true,
          animationEnabled: true,
          cardStyle: { backgroundColor: '#000000' },
          cardOverlayEnabled: true,
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
        <Stack.Screen
          name="event-detail/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
        <Stack.Screen
          name="mock-payment/index"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
        <Stack.Screen
          name="ticket-details/index"
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#000000' },
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
