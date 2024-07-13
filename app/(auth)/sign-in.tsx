import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    validateForm();
  }, [emailAddress, password]);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!emailAddress.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError('Email is invalid');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    }

    setIsFormValid(isValid);
  };

  // Add this function
  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const onSignInPress = async () => {
    setShowErrors(true);
    validateForm();
    if (!isLoaded) return;

    setIsSubmitting(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        await SecureStore.setItemAsync(
          'userToken',
          // @ts-ignore
          signInAttempt.createdSessionId
        );
        router.replace('/(tabs)');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      // Handle sign-in error
      // @ts-ignore
      if (err.errors && err.errors[0].code === 'form_identifier_not_found') {
        setPasswordError("Couldn't find your account.");
        // @ts-ignore
      } else if (err.errors && err.errors[0].message) {
        // @ts-ignore
        setPasswordError(err.errors[0].message);
      } else {
        setPasswordError('An error occurred during sign in');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.headerText}>Sign in to your account</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Email..."
                onChangeText={(email) => setEmailAddress(email)}
                style={styles.input}
              />
              {showErrors && emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                placeholder="Password..."
                secureTextEntry={true}
                onChangeText={(password) => setPassword(password)}
                style={styles.input}
              />
              {showErrors && passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onSignInPress}
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/sign-up')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    marginTop: 32,
  },
  headerText: {
    marginBottom: 32,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2d3748',
    borderRadius: 4,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  button: {
    backgroundColor: '#4c51bf',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#4c51bf80', // Add some transparency to show it's disabled
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#4c51bf',
    fontSize: 14,
  },
});
