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
  Image,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons if you haven't already

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [phone, setPhone] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isEmailApproved, setIsEmailApproved] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dateError, setDateError] = useState('');

  const [touchedInputs, setTouchedInputs] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    phone: false,
    date: false,
  });

  useEffect(() => {
    if (touchedInputs.email) validateEmail();
  }, [emailAddress, touchedInputs.email]);

  useEffect(() => {
    if (touchedInputs.password) validatePassword();
  }, [password, touchedInputs.password]);

  useEffect(() => {
    if (touchedInputs.confirmPassword) validateConfirmPassword();
  }, [password, confirmPassword, touchedInputs.confirmPassword]);

  useEffect(() => {
    if (touchedInputs.phone) validatePhone();
  }, [phone, touchedInputs.phone]);

  useEffect(() => {
    if (touchedInputs.date) validateAge();
  }, [dateOfBirth, touchedInputs.date]);

  const validateEmail = async () => {
    if (!emailAddress.trim()) {
      setEmailError('El correo electrónico es requerido');
      setIsEmailApproved(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError('El correo electrónico no es válido');
      setIsEmailApproved(false);
      return;
    }

    setIsCheckingEmail(true);
    const { data, error } = await supabase
      .from('approved_emails')
      .select('email')
      .eq('email', emailAddress)
      .single();

    setIsCheckingEmail(false);

    if (!error && data) {
      setIsEmailApproved(true);
      setEmailError('');
    } else {
      setIsEmailApproved(false);
      setEmailError(
        'Este correo electrónico no está aprobado para registrarse'
      );
    }
  };

  //!TODO passwords in data breach trigger errors

  const validatePassword = () => {
    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{1,}$/.test(password)) {
      setPasswordError(
        'La contraseña debe contener al menos una letra y un número'
      );
      return;
    }

    setPasswordError('');
  };

  const validateConfirmPassword = () => {
    if (password !== confirmPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden');
    } else {
      setConfirmPasswordError('');
    }
  };

  const validatePhone = () => {
    if (!/^0\d{9}$/.test(phone)) {
      setPhoneError(
        'El número de teléfono debe tener 10 dígitos y comenzar con 0'
      );
    } else {
      setPhoneError('');
    }
  };

  const validateAge = () => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setDateError('Debes ser mayor de 18 años para registrarte');
      return false;
    } else {
      setDateError('');
      return true;
    }
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    setDateOfBirth(date);
    setTouchedInputs((prev) => ({ ...prev, date: true }));
    hideDatePicker();
  };

  const onSignUpPress = async () => {
    setTouchedInputs({
      email: true,
      password: true,
      confirmPassword: true,
      phone: true,
      date: true,
    });

    if (
      !isLoaded ||
      !isEmailApproved ||
      passwordError ||
      confirmPasswordError ||
      phoneError ||
      dateError ||
      !validateAge()
    )
      return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      if (err.errors && err.errors[0].code === 'form_password_pwned') {
        setPasswordError(
          'Please choose a stronger password for your security.'
        );
      } else {
        Alert.alert(
          'Error',
          'Error al registrarse. Por favor, inténtalo de nuevo.'
        );
      }
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status !== 'complete') {
        console.log(JSON.stringify(completeSignUp, null, 2));
        throw new Error('El estado del registro no está completo');
      }

      await setActive({ session: completeSignUp.createdSessionId });

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            clerk_id: completeSignUp.createdUserId,
            email: emailAddress,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth.toISOString().split('T')[0],
            phone: phone,
          },
        ])
        .select();

      if (error) {
        console.error(
          'Error al almacenar los datos del usuario en Supabase:',
          error.message,
          error.details,
          error.hint
        );
        Alert.alert(
          'Error',
          'Error al almacenar los datos del usuario. Por favor, inténtalo de nuevo.'
        );
      } else {
        console.log('Datos del usuario almacenados en Supabase:', data);
        await SecureStore.setItemAsync(
          'userToken',
          completeSignUp.createdSessionId
        );
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        'Error',
        'Error al verificar el correo electrónico. Por favor, inténtalo de nuevo.'
      );
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
            <Text style={styles.headerText}>Regístrate</Text>
            {!pendingVerification && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo electrónico</Text>
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Correo electrónico..."
                    onChangeText={(email) => setEmailAddress(email)}
                    onBlur={() =>
                      setTouchedInputs((prev) => ({ ...prev, email: true }))
                    }
                    style={[
                      styles.input,
                      isEmailApproved && styles.approvedEmailInput,
                    ]}
                    placeholderTextColor="#666"
                  />
                  {isCheckingEmail && (
                    <Text style={styles.checkingText}>Verificando...</Text>
                  )}
                  {!isCheckingEmail && isEmailApproved && (
                    <Text style={styles.approvedText}>Close Friend</Text>
                  )}
                  {touchedInputs.email && emailError ? (
                    <Text style={styles.errorText}>{emailError}</Text>
                  ) : null}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      value={password}
                      placeholder="Contraseña..."
                      secureTextEntry={!showPassword}
                      onChangeText={(password) => setPassword(password)}
                      onBlur={() =>
                        setTouchedInputs((prev) => ({
                          ...prev,
                          password: true,
                        }))
                      }
                      style={styles.passwordInput}
                      placeholderTextColor="#666"
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
                  {touchedInputs.password && passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirmar Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      value={confirmPassword}
                      placeholder="Confirmar Contraseña..."
                      secureTextEntry={!showConfirmPassword}
                      onChangeText={(confirmPass) =>
                        setConfirmPassword(confirmPass)
                      }
                      onBlur={() =>
                        setTouchedInputs((prev) => ({
                          ...prev,
                          confirmPassword: true,
                        }))
                      }
                      style={styles.passwordInput}
                      placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  {touchedInputs.confirmPassword && confirmPasswordError ? (
                    <Text style={styles.errorText}>{confirmPasswordError}</Text>
                  ) : null}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    value={firstName}
                    placeholder="Nombre..."
                    onChangeText={(name) => setFirstName(name)}
                    style={styles.input}
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Apellido</Text>
                  <TextInput
                    value={lastName}
                    placeholder="Apellido..."
                    onChangeText={(name) => setLastName(name)}
                    style={styles.input}
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fecha de Nacimiento</Text>
                  <TouchableOpacity
                    onPress={showDatePicker}
                    style={styles.datePickerButton}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {dateOfBirth.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirm}
                    onCancel={hideDatePicker}
                    maximumDate={new Date()}
                  />
                  {touchedInputs.date && dateError ? (
                    <Text style={styles.errorText}>{dateError}</Text>
                  ) : null}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    value={phone}
                    placeholder="0999705758"
                    onChangeText={(phone) => setPhone(phone)}
                    onBlur={() =>
                      setTouchedInputs((prev) => ({ ...prev, phone: true }))
                    }
                    style={styles.input}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                  {touchedInputs.phone && phoneError ? (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={onSignUpPress}
                  style={[
                    styles.button,
                    (!isEmailApproved ||
                      passwordError ||
                      confirmPasswordError ||
                      phoneError ||
                      dateError) &&
                      styles.buttonDisabled,
                  ]}
                  disabled={
                    !isEmailApproved ||
                    passwordError ||
                    confirmPasswordError ||
                    phoneError ||
                    dateError
                  }
                >
                  <Text style={styles.buttonText}>Registrarse</Text>
                </TouchableOpacity>
              </>
            )}
            {pendingVerification && (
              <>
                <TextInput
                  value={code}
                  placeholder="Código de Verificación..."
                  onChangeText={(code) => setCode(code)}
                  style={styles.input}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={onPressVerify} style={styles.button}>
                  <Text style={styles.buttonText}>Verificar Correo</Text>
                </TouchableOpacity>
              </>
            )}
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
  },
  eyeIcon: {
    padding: 10,
  },
  approvedEmailInput: {
    borderColor: '#4BB543',
    borderWidth: 2,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  approvedText: {
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
  datePickerButton: {
    backgroundColor: '#333',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#727272',
  },
  datePickerButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
