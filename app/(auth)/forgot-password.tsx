import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const clerk = useClerk();
  const router = useRouter();

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email is invalid');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setIsSubmitting(true);
    try {
      await clerk.client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setResetSent(true);
    } catch (err) {
      console.error('Error sending reset password email', err);
      setEmailError('Error sending reset password email. Please try again.');
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
        <View style={styles.innerContainer}>
          <Text style={styles.headerText}>Reset Your Password</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              value={email}
              placeholder="Email..."
              onChangeText={(text) => setEmail(text)}
              style={styles.input}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleResetPassword}
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
          {resetSent && (
            <Text style={styles.successText}>
              Check your email for the password reset link.
            </Text>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
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
  buttonDisabled: {
    backgroundColor: '#4c51bf80',
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
  successText: {
    color: 'green',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4c51bf',
    fontSize: 16,
  },
});
