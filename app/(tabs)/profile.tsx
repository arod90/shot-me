// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Animated, {
  FadeInDown,
  Layout,
  SlideInDown,
} from 'react-native-reanimated';

export default function ProfileScreen() {
  const { userId } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (!userId) return;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const fileExtension = uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExtension}`;
      const { uri: fileUri } = await FileSystem.getInfoAsync(uri);
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExtension}`,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: data.publicUrl });
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'An error occurred while uploading the image');
    } finally {
      setUploading(false);
    }
  };

  const decode = (base64) => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const bufferLength = base64.length * 0.75;
    const arr = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
      const encoded1 = chars.indexOf(base64[i]);
      const encoded2 = chars.indexOf(base64[i + 1]);
      const encoded3 = chars.indexOf(base64[i + 2]);
      const encoded4 = chars.indexOf(base64[i + 3]);
      arr[p++] = (encoded1 << 2) | (encoded2 >> 4);
      arr[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      arr[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arr;
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Unable to load user data</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.avatarContainer}
        >
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </View>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FF5252" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.infoContainer}
        >
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="person-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoText}>
                {`${user.first_name} ${user.last_name}`}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="mail-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="call-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(600).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="calendar-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoText}>
                {new Date(user.date_of_birth).toLocaleDateString()}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(700).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="hourglass-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoText}>
                {calculateAge(user.date_of_birth)} years
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(800).springify()}
            style={styles.infoItem}
          >
            <Ionicons name="ticket-outline" size={24} color="#FF5252" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Events Attended</Text>
              <Text style={styles.infoText}>{user.events_attended || 0}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#FF5252',
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5252',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 75,
  },
  infoContainer: {
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 5,
    fontFamily: 'Oswald_400Regular',
  },
  infoText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Oswald_400Regular',
  },
});
