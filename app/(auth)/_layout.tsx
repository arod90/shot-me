import { Stack } from 'expo-router';
import { TransitionPresets } from '@react-navigation/stack';

export default function AuthLayout() {
  return (
    <Stack
      // @ts-ignore
      screenOptions={{
        ...TransitionPresets.SlideFromRightIOS,
        headerShown: false,
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
