// @ts-nocheck
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
  Image,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSignIn, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signOut } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => {
    validateForm();
  }, [emailAddress, password]);

  useEffect(() => {
    const checkEmail = async () => {
      if (emailAddress.includes('@')) {
        setEmailStatus('checking');
        const { data: approvedData, error: approvedError } = await supabase
          .from('approved_emails')
          .select('email')
          .eq('email', emailAddress)
          .single();

        if (!approvedError && approvedData) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('email', emailAddress)
            .single();

          if (!userError && userData) {
            setEmailStatus('approved');
          } else {
            setEmailStatus('approved_unregistered');
          }
        } else {
          setEmailStatus('');
        }
      } else {
        setEmailStatus('');
      }
    };

    checkEmail();
  }, [emailAddress]);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!emailAddress.trim()) {
      setEmailError('El correo electrónico es requerido');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError('El correo electrónico no es válido');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      isValid = false;
    }

    setIsFormValid(isValid);
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const onSignInPress = async () => {
    setShowErrors(true);
    validateForm();
    if (!isLoaded || !isFormValid) return;

    if (emailStatus === 'approved_unregistered') {
      Alert.alert(
        'Cuenta no registrada',
        'Tu correo electrónico está aprobado pero aún no tienes una cuenta. ¿Te gustaría registrarte?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Registrarse',
            onPress: () => router.push('/sign-up'),
          },
        ]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await signOut();

      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        await SecureStore.setItemAsync(
          'userToken',
          signInAttempt.createdSessionId
        );
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      if (err.errors && err.errors[0].code === 'session_exists') {
        try {
          await signOut();
          const retrySignIn = await signIn.create({
            identifier: emailAddress,
            password,
          });
          if (retrySignIn.status === 'complete') {
            await setActive({ session: retrySignIn.createdSessionId });
            await SecureStore.setItemAsync(
              'userToken',
              retrySignIn.createdSessionId
            );
            router.replace('/(tabs)');
          }
        } catch (retryError) {
          console.error('Retry sign in error:', retryError);
          setPasswordError(
            'Error al iniciar sesión. Por favor, inténtalo de nuevo.'
          );
        }
      } else if (
        err.errors &&
        err.errors[0].code === 'form_identifier_not_found'
      ) {
        setPasswordError(
          'No se pudo encontrar tu cuenta o el correo no está aprobado.'
        );
      } else if (err.errors && err.errors[0].message) {
        setPasswordError(err.errors[0].message);
      } else {
        setPasswordError('Ocurrió un error durante el inicio de sesión');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContainer}>
            <Image
              source={require('../../assets/images/logo-blanco-nombre.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Correo electrónico..."
                onChangeText={(email) => setEmailAddress(email)}
                style={[
                  styles.input,
                  emailStatus === 'approved' && styles.approvedEmailInput,
                  emailStatus === 'approved_unregistered' &&
                    styles.approvedUnregisteredEmailInput,
                ]}
                placeholderTextColor="#666"
                keyboardType="email-address"
                returnKeyType="next"
                enablesReturnKeyAutomatically
                blurOnSubmit={false}
              />
              {showErrors && emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              {emailStatus === 'checking' && (
                <Text style={styles.checkingText}>Verificando...</Text>
              )}
              {emailStatus === 'approved' && (
                <Text style={styles.approvedText}>Correo aprobado</Text>
              )}
              {emailStatus === 'approved_unregistered' && (
                <Text style={styles.approvedUnregisteredText}>
                  Correo aprobado, puedes registrarte
                </Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                value={password}
                placeholder="Contraseña..."
                secureTextEntry={true}
                onChangeText={(password) => setPassword(password)}
                style={styles.input}
                placeholderTextColor="#666"
                returnKeyType="done"
                enablesReturnKeyAutomatically
                onSubmitEditing={onSignInPress}
              />
              {showErrors && passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onSignInPress}
              style={[
                styles.button,
                (!isFormValid || isSubmitting) && styles.buttonDisabled,
              ]}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Inicia Sesión</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/sign-up')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Regístrate</Text>
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
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  approvedEmailInput: {
    borderColor: '#4BB543',
    borderWidth: 2,
  },
  approvedUnregisteredEmailInput: {
    borderColor: '#FFA500',
    borderWidth: 2,
  },
  button: {
    backgroundColor: '#FF5252',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    width: '100%',
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
  approvedText: {
    color: '#4BB543',
    fontSize: 12,
    marginTop: 4,
  },
  approvedUnregisteredText: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 4,
  },
  checkingText: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#FF525280',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#FF5252',
    fontSize: 14,
  },
});
