import React, { useState, useEffect, useRef } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, Linking } from 'react-native';
import LoadingScreen from '../components/LoadingScreen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import {
  registerForPushNotificationsAsync,
  setupNotifications,
} from './utils/notifications';
import { supabase } from '../supabase';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
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
        // If the column doesn't exist, log a more specific error
        if (error.code === 'PGRST204') {
          console.error(
            'The push_token column might not exist in the users table'
          );
        }
      } else {
        console.log('Push token updated successfully');
      }
    } catch (error) {
      console.error('Unexpected error in updateUserPushToken:', error);
    }
  };

  React.useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isSignedIn, isLoaded]);

  React.useEffect(() => {
    const handleDeepLink = ({ url }) => {
      console.log('Received deep link:', url);

      if (url.includes('payment-success')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const ticketId = params.get('ticketId');
        const message = params.get('message');
        console.log('Payment success:', { ticketId, message });

        router.push({
          pathname: '/(tabs)/tickets',
          params: { ticketId, message },
        });
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event-detail/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="mock-payment/index"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="ticket-details/index"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
