// app/clerkConfig.js
import * as SecureStore from 'expo-secure-store';
import { ClerkProvider } from '@clerk/clerk-expo';
import React from 'react';

const EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

SecureStore.setItemAsync('clerk-js', 'true'); // This is a workaround for Expo SecureStore

export const ClerkWrapper = ({ children }) => (
  <ClerkProvider publishableKey={EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
    {children}
  </ClerkProvider>
);
