// @ts-nocheck

'use client';

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
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClerk, useSignIn, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const clerk = useClerk();
  const { signIn, setActive } = useSignIn();
  const { signOut } = useAuth();
  const router = useRouter();

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('El correo electrónico es obligatorio');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('El correo electrónico no es válido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setIsSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setResetSent(true);
    } catch (err) {
      console.error(
        'Error al enviar el correo de restablecimiento de contraseña',
        err
      );
      setEmailError(
        'Error al enviar el correo de restablecimiento. Por favor, inténtalo de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyResetCode = async () => {
    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      });

      if (result.status === 'complete') {
        // Sign out the user to clear any existing sessions
        await signOut();
        Alert.alert(
          'Éxito',
          'Contraseña restablecida correctamente. Por favor, inicia sesión con tu nueva contraseña.',
          [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
        );
      } else {
        throw new Error('Unable to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      Alert.alert(
        'Error',
        'Error al restablecer la contraseña. Por favor, inténtalo de nuevo.'
      );
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
          <Image
            source={require('../../assets/images/logo-blanco-nombre.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerText}>Restablecer tu contraseña</Text>
          {!resetSent ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                autoCapitalize="none"
                value={email}
                placeholder="Correo electrónico..."
                onChangeText={(text) => setEmail(text)}
                style={styles.input}
                placeholderTextColor="#666"
              />
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              <TouchableOpacity
                onPress={handleResetPassword}
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Enviar código de restablecimiento
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de restablecimiento</Text>
              <TextInput
                value={resetCode}
                placeholder="Ingrese el código..."
                onChangeText={(text) => setResetCode(text)}
                style={styles.input}
                placeholderTextColor="#666"
              />
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={newPassword}
                  placeholder="Nueva contraseña..."
                  onChangeText={(text) => setNewPassword(text)}
                  style={styles.passwordInput}
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleVerifyResetCode}
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Restablecer Contraseña</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Volver a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 20,
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
    backgroundColor: '#333',
    borderRadius: 4,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#727272',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF5252',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#FF525280',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: '#4BB543',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FF5252',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#727272',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
});
