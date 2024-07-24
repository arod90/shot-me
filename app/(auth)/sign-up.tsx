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
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '@/supabase';
import { useNavigation } from '@react-navigation/native';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const navigation = useNavigation();

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

  // @ts-ignore
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
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        await SecureStore.setItemAsync(
          'userToken',
          // @ts-ignore
          completeSignUp.createdSessionId
        );

        // Store user data in Supabase
        const { data, error } = await supabase
          .from('Users')
          .insert([
            {
              email: emailAddress,
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dateOfBirth.toISOString().split('T')[0],
              phone: phone,
              // clerk_user_id: completeSignUp.createdUserId,
            },
          ])
          .select();

        if (error) {
          console.error(
            'Error storing user data in Supabase:',
            error.message,
            error.details,
            error.hint
          );
          // Handle error (e.g., show error message to user)
        } else {
          console.log('User data stored in Supabase:', data);
          router.replace('/(tabs)');
        }
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.goBackContainer}
            >
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Sign up for an account</Text>
            {!pendingVerification && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Email..."
                    onChangeText={(email) => setEmailAddress(email)}
                    style={styles.input}
                  />
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
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    placeholder="Confirm Password..."
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
                  />
                  {!passwordsMatch && confirmPassword !== '' && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    value={firstName}
                    placeholder="First Name..."
                    onChangeText={(name) => setFirstName(name)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    value={lastName}
                    placeholder="Last Name..."
                    onChangeText={(name) => setLastName(name)}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date of Birth</Text>
                  <TouchableOpacity
                    onPress={showDatePicker}
                    style={styles.datePickerButton}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {dateOfBirth.toDateString()}
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
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    value={phone}
                    placeholder="Phone..."
                    onChangeText={(phone) => setPhone(phone)}
                    style={styles.input}
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
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            {pendingVerification && (
              <>
                <TextInput
                  value={code}
                  placeholder="Verification Code..."
                  onChangeText={(code) => setCode(code)}
                  style={styles.input}
                />
                <TouchableOpacity onPress={onPressVerify} style={styles.button}>
                  <Text style={styles.buttonText}>Verify Email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ... (imports remain the same)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#292929',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    marginTop: 32,
  },
  goBackContainer: {
    marginBottom: 16,
  },
  goBackText: {
    color: '#FF5252',
    textDecorationLine: 'underline',
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
    backgroundColor: '#434343',
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
    backgroundColor: '#434343',
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
