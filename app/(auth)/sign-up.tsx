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
  Alert,
  SafeAreaView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const emailDebounceTimer = React.useRef(null);

  // Form fields state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [phone, setPhone] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Form validation states
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    phone: false,
    date: false,
  });

  const [formValidation, setFormValidation] = useState({
    isEmailValid: false,
    isPasswordValid: false,
    isPasswordMatch: false,
    isPhoneValid: false,
    isAgeValid: false,
  });

  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    date: '',
  });

  // Validation functions
  const validateEmail = async (email, shouldSetTouched = false) => {
    if (shouldSetTouched) {
      setTouched((prev) => ({ ...prev, email: true }));
    }

    setIsCheckingEmail(true);
    try {
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        setFormValidation((prev) => ({ ...prev, isEmailValid: false }));
        if (touched.email) {
          setFormErrors((prev) => ({
            ...prev,
            email: 'El correo electrónico no es válido',
          }));
        }
        return;
      }

      const { data } = await supabase
        .from('approved_emails')
        .select('email')
        .eq('email', email)
        .single();

      if (data) {
        setFormErrors((prev) => ({ ...prev, email: '' }));
        setFormValidation((prev) => ({ ...prev, isEmailValid: true }));
      } else {
        setFormValidation((prev) => ({ ...prev, isEmailValid: false }));
        setFormErrors((prev) => ({
          ...prev,
          email: 'Este correo electrónico no está aprobado',
        }));
      }
    } catch (error) {
      console.error('Email validation error:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const validatePassword = (value) => {
    const isValid = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
    setFormValidation((prev) => ({ ...prev, isPasswordValid: isValid }));
    if (touched.password) {
      setFormErrors((prev) => ({
        ...prev,
        password: isValid
          ? ''
          : 'La contraseña debe tener al menos 8 caracteres, una letra y un número',
      }));
    }
    return isValid;
  };

  const validatePasswordMatch = (pass, confirm) => {
    const isMatch = pass === confirm && pass !== '';
    setFormValidation((prev) => ({ ...prev, isPasswordMatch: isMatch }));
    if (touched.confirmPassword) {
      setFormErrors((prev) => ({
        ...prev,
        confirmPassword: isMatch ? '' : 'Las contraseñas no coinciden',
      }));
    }
    return isMatch;
  };

  const validatePhone = (value) => {
    const isValid = /^0\d{9}$/.test(value);
    setFormValidation((prev) => ({ ...prev, isPhoneValid: isValid }));
    if (touched.phone) {
      setFormErrors((prev) => ({
        ...prev,
        phone: isValid ? '' : 'El número debe tener 10 dígitos y empezar con 0',
      }));
    }
    return isValid;
  };

  const validateAge = (date) => {
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isValid = age >= 18;
    setFormValidation((prev) => ({ ...prev, isAgeValid: isValid }));
    if (touched.date) {
      setFormErrors((prev) => ({
        ...prev,
        date: isValid ? '' : 'Debes ser mayor de 18 años',
      }));
    }
    return isValid;
  };

  // Input handlers
  const handleEmailChange = (text) => {
    setEmailAddress(text);
    if (emailDebounceTimer.current) {
      clearTimeout(emailDebounceTimer.current);
    }
    emailDebounceTimer.current = setTimeout(() => {
      validateEmail(text, true);
    }, 1500);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setTouched((prev) => ({ ...prev, password: true }));
    validatePassword(text);
    if (confirmPassword) {
      validatePasswordMatch(text, confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    validatePasswordMatch(password, text);
  };

  const handlePhoneChange = (text) => {
    setPhone(text);
    setTouched((prev) => ({ ...prev, phone: true }));
    validatePhone(text);
  };

  const handleDateConfirm = (date) => {
    setDatePickerVisibility(false);
    setDateOfBirth(date);
    setTouched((prev) => ({ ...prev, date: true }));
    validateAge(date);
  };

  const isFormValid = () => {
    const validations = Object.values(formValidation).every(
      (value) => value === true
    );
    const namesValid = firstName.trim() !== '' && lastName.trim() !== '';
    return validations && namesValid;
  };

  const handleSignUp = async () => {
    if (!isLoaded || !isFormValid()) {
      return;
    }

    try {
      // Only send Clerk what it needs for authentication
      console.log('Creating user authentication...');
      const signUpAttempt = await signUp.create({
        emailAddress,
        password,
      });

      // Proceed with email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error('Signup error:', err);

      let errorMessage = 'Error al registrarse. ';
      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        errorMessage += 'Este correo electrónico ya está registrado.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded || !code) return;

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        // First create the user in Supabase
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            clerk_id: result.createdUserId,
            email: emailAddress,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth.toISOString().split('T')[0],
            phone,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user in Supabase:', createError);
          throw createError;
        }

        // Then set the active session
        await setActive({ session: result.createdSessionId });

        // Store the session token
        await SecureStore.setItemAsync('userToken', result.createdSessionId);

        // Navigate to home
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Error in verification:', err);
      Alert.alert('Error', 'Error in verification');
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.header}>Verificación</Text>
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Código de verificación"
            placeholderTextColor="#666"
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerification}>
            <Text style={styles.buttonText}>Verificar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.form}>
              <Text style={styles.header}>Registro</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    formValidation.isEmailValid && styles.validInput,
                  ]}
                  value={emailAddress}
                  onChangeText={handleEmailChange}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {isCheckingEmail ? (
                  <Text style={styles.checkingText}>Verificando...</Text>
                ) : formValidation.isEmailValid ? (
                  <Text style={styles.success}>Close Friend</Text>
                ) : emailAddress && touched.email && formErrors.email ? (
                  <Text style={styles.error}>{formErrors.email}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="Contraseña"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    textContentType="oneTimeCode"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {touched.password && formErrors.password ? (
                  <Text style={styles.error}>{formErrors.password}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    placeholder="Confirmar Contraseña"
                    placeholderTextColor="#666"
                    secureTextEntry={!showConfirmPassword}
                    textContentType="oneTimeCode"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {touched.confirmPassword && formErrors.confirmPassword ? (
                  <Text style={styles.error}>{formErrors.confirmPassword}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Nombre"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Apellido"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fecha de Nacimiento</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickerVisibility(true)}
                >
                  <Text style={styles.dateText}>
                    {dateOfBirth.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {touched.date && formErrors.date ? (
                  <Text style={styles.error}>{formErrors.date}</Text>
                ) : null}
              </View>

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerVisibility(false)}
                maximumDate={new Date()}
              />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="0999999999"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
                {touched.phone && formErrors.phone ? (
                  <Text style={styles.error}>{formErrors.phone}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.button, !isFormValid() && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={!isFormValid()}
              >
                <Text style={styles.buttonText}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  form: {
    marginTop: 32,
  },
  header: {
    marginBottom: 10,
    fontFamily: 'Oswald_400Regular',
    fontSize: 32,
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
  },
  validInput: {
    borderColor: '#4BB543',
    borderWidth: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#727272',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 0,
  },
  eyeIcon: {
    padding: 10,
  },
  dateButton: {
    backgroundColor: '#333',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#727272',
  },
  dateText: {
    color: 'white',
    fontSize: 16,
  },
  error: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
  },
  success: {
    color: '#4BB543',
    fontSize: 12,
    marginTop: 4,
  },
  checkingText: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 4,
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
});
