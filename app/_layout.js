import React, { useState, useEffect, useRef } from 'react';
import {
  ClerkProvider,
  ClerkLoaded,
  useAuth,
  useUser,
} from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, Linking } from 'react-native';
import LoadingScreen from '../components/LoadingScreen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { supabase } from '../supabase';
import {
  registerForPushNotificationsAsync,
  setupNotifications,
} from './utils/notifications';

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
          // Fetch user data from Supabase
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

          if (userError) {
            if (userError.code === 'PGRST116') {
              // User not found, create new user
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  clerk_id: userId,
                  email: user.primaryEmailAddress?.emailAddress || '',
                  first_name: user.firstName || '',
                  last_name: user.lastName || '',
                  // Add other fields as necessary
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

          // User exists or has been created, safe to redirect
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Error setting up user:', error);
          // Handle error (e.g., show error message to user)
        }
      } else if (isLoaded && !isSignedIn) {
        router.replace('/(auth)/sign-in');
      }
    };

    setupUser();
  }, [isSignedIn, isLoaded, userId, user]);

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
// import React, { useState, useEffect } from 'react';
// import {
//   ClerkProvider,
//   ClerkLoaded,
//   useAuth,
//   useUser,
// } from '@clerk/clerk-expo';
// import { Stack, useRouter } from 'expo-router';
// import { View, ActivityIndicator, Linking, Text } from 'react-native';
// import {
//   useFonts,
//   Oswald_400Regular,
//   BebasNeue_400Regular,
// } from '@expo-google-fonts/dev';
// import LoadingScreen from '../components/LoadingScreen';
// import { QueryClientProvider } from '@tanstack/react-query';
// import { queryClient } from './queryClient';
// import { supabase } from '../lib/supabase';
// import Config from '../config';
// import {
//   registerForPushNotificationsAsync,
//   setupNotifications,
// } from './utils/notifications';

// const FallbackLoadingScreen = () => (
//   <View
//     style={{
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#000000',
//     }}
//   >
//     <ActivityIndicator size="large" color="#FF5252" />
//     <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Loading app...</Text>
//   </View>
// );

// export default function RootLayout() {
//   const [isLoading, setIsLoading] = useState(true);
//   const [fontsError, setFontsError] = useState(null);

//   const [fontsLoaded] = useFonts({
//     Oswald_400Regular,
//     BebasNeue_400Regular,
//   });

//   useEffect(() => {
//     // Handle font loading errors
//     if (!fontsLoaded) {
//       console.log('Fonts still loading or failed to load');
//     }

//     const timer = setTimeout(() => {
//       setIsLoading(false);
//     }, 3000);

//     return () => clearTimeout(timer);
//   }, [fontsLoaded]);

//   // Show loading screen while fonts are loading
//   if (!fontsLoaded && !fontsError) {
//     return <FallbackLoadingScreen />;
//   }

//   // Show loading screen during initial app load
//   if (isLoading) {
//     return <LoadingScreen />;
//   }

//   return (
//     <QueryClientProvider client={queryClient}>
//       <ClerkProvider publishableKey={Config.CLERK_PUBLISHABLE_KEY}>
//         <ClerkLoaded>
//           <RootLayoutNav />
//         </ClerkLoaded>
//       </ClerkProvider>
//     </QueryClientProvider>
//   );
// }

// function RootLayoutNav() {
//   const { isSignedIn, isLoaded, userId } = useAuth();
//   const { user } = useUser();
//   const router = useRouter();
//   const [expoPushToken, setExpoPushToken] = useState('');
//   const [notification, setNotification] = useState(false);

//   useEffect(() => {
//     try {
//       registerForPushNotificationsAsync().then((token) => {
//         if (token) setExpoPushToken(token);
//       });

//       const cleanup = setupNotifications((notification) => {
//         setNotification(notification);
//       });

//       return () => {
//         cleanup();
//       };
//     } catch (error) {
//       console.error('Error setting up notifications:', error);
//     }
//   }, []);

//   useEffect(() => {
//     if (expoPushToken && userId) {
//       updateUserPushToken(userId, expoPushToken).catch((error) => {
//         console.error('Error updating push token:', error);
//       });
//     }
//   }, [expoPushToken, userId]);

//   const updateUserPushToken = async (userId, token) => {
//     try {
//       const { data: userData, error: userError } = await supabase
//         .from('users')
//         .select('id')
//         .eq('clerk_id', userId)
//         .single();

//       if (userError) {
//         console.error('Error fetching user:', userError);
//         return;
//       }

//       if (!userData) {
//         console.error('User not found');
//         return;
//       }

//       const { error } = await supabase
//         .from('users')
//         .update({ push_token: token })
//         .eq('id', userData.id);

//       if (error) {
//         console.error('Error updating push token:', error);
//       }
//     } catch (error) {
//       console.error('Unexpected error in updateUserPushToken:', error);
//     }
//   };

//   useEffect(() => {
//     const setupUser = async () => {
//       if (isLoaded && isSignedIn && userId && user) {
//         try {
//           const { data: userData, error: userError } = await supabase
//             .from('users')
//             .select('id')
//             .eq('clerk_id', userId)
//             .single();

//           if (userError) {
//             if (userError.code === 'PGRST116') {
//               const { error: createError } = await supabase
//                 .from('users')
//                 .insert({
//                   clerk_id: userId,
//                   email: user.primaryEmailAddress?.emailAddress || '',
//                   first_name: user.firstName || '',
//                   last_name: user.lastName || '',
//                 })
//                 .select('id')
//                 .single();

//               if (createError) throw createError;
//             } else {
//               throw userError;
//             }
//           }

//           router.replace('/(tabs)');
//         } catch (error) {
//           console.error('Error setting up user:', error);
//         }
//       } else if (isLoaded && !isSignedIn) {
//         router.replace('/(auth)/sign-in');
//       }
//     };

//     setupUser();
//   }, [isSignedIn, isLoaded, userId, user]);

//   if (!isLoaded) {
//     return <LoadingScreen />;
//   }

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="(auth)" options={{ headerShown: false }} />
//       <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//       <Stack.Screen
//         name="event-detail/[id]"
//         options={{
//           presentation: 'modal',
//           animation: 'slide_from_right',
//         }}
//       />
//       <Stack.Screen
//         name="mock-payment/index"
//         options={{
//           presentation: 'modal',
//           animation: 'slide_from_bottom',
//         }}
//       />
//       <Stack.Screen
//         name="ticket-details/index"
//         options={{
//           presentation: 'modal',
//           animation: 'slide_from_right',
//         }}
//       />
//     </Stack>
//   );
// }
