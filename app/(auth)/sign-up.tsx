// @ts-nocheck
import React, { useState } from 'react';
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

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [phone, setPhone] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const passwordsMatch = password === confirmPassword;

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    setDateOfBirth(date);
    hideDatePicker();
  };

  const onSignUpPress = async () => {
    if (!isLoaded || !passwordsMatch) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        'Error',
        'Error al registrarse. Por favor, inténtalo de nuevo.'
      );
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
                    style={styles.input}
                    placeholderTextColor="#666"
                  />
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
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirmar Contraseña</Text>
                  <TextInput
                    value={confirmPassword}
                    placeholder="Confirmar Contraseña..."
                    secureTextEntry={true}
                    onChangeText={(confirmPass) =>
                      setConfirmPassword(confirmPass)
                    }
                    style={[
                      styles.input,
                      !passwordsMatch &&
                        confirmPassword !== '' &&
                        styles.inputError,
                    ]}
                    placeholderTextColor="#666"
                  />
                  {!passwordsMatch && confirmPassword !== '' && (
                    <Text style={styles.errorText}>
                      Las contraseñas no coinciden
                    </Text>
                  )}
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
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    value={phone}
                    placeholder="Teléfono..."
                    onChangeText={(phone) => setPhone(phone)}
                    style={styles.input}
                    placeholderTextColor="#666"
                  />
                </View>
                <TouchableOpacity
                  onPress={onSignUpPress}
                  style={[
                    styles.button,
                    !passwordsMatch && styles.buttonDisabled,
                  ]}
                  disabled={!passwordsMatch}
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
  logo: {
    width: 200,
    height: 100,
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
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
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
