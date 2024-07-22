import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [purchasedUsers, setPurchasedUsers] = useState([]);
  const { userId } = useAuth();

  useEffect(() => {
    fetchEventDetails();
    fetchUsers();
  }, []);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert('Error', 'Unable to load event details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: interested, error: interestedError } = await supabase
        .from('userevents')
        .select(
          `
          *,
          users(first_name, last_name)
        `
        )
        .eq('event_id', id)
        .eq('status', 'interested');

      if (interestedError) throw interestedError;

      const { data: purchased, error: purchasedError } = await supabase
        .from('userevents')
        .select(
          `
          *,
          users(first_name, last_name)
        `
        )
        .eq('event_id', id)
        .eq('status', 'purchased');

      if (purchasedError) throw purchasedError;

      setInterestedUsers(interested);
      setPurchasedUsers(purchased);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleBuyTicket = () => {
    router.replace(`/mock-payment?eventId=${id}&userId=${userId}`);
  };

  const handleInterested = async () => {
    try {
      // Fetch the Supabase user ID using the Clerk ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }

      // Check if the user already marked interest
      const { data: existingRecord, error: checkError } = await supabase
        .from('userevents')
        .select('*')
        .eq('user_id', userData.id)
        .eq('event_id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingRecord) {
        const { error } = await supabase.from('userevents').insert({
          user_id: userData.id,
          event_id: id,
          status: 'interested',
        });

        if (error) {
          console.error('Error inserting user_event:', error);
          throw error;
        }

        Alert.alert('Interested', 'You have marked this event as interested.');
      } else {
        Alert.alert(
          'Already Interested',
          'You have already marked this event as interested.'
        );
      }

      fetchUsers(); // Refresh the users list
    } catch (error) {
      console.error('Error marking as interested:', error);
      Alert.alert('Error', 'Unable to mark as interested');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!event) {
    return <Text style={styles.loadingText}>No event found</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.eventDate}>
            {new Date(event.event_date)
              .toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
              .toUpperCase()}
          </Text>
          <Text style={styles.eventName}>{event.event_name.toUpperCase()}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={24} color="#FF5252" />
            <Text style={styles.eventLocation}>{event.location}</Text>
          </View>
        </View>
        <View style={styles.usersContainer}>
          <Text style={styles.usersTitle}>Interested Users:</Text>
          {interestedUsers.map((user) => (
            <Text key={user.id} style={styles.userName}>
              {user.users.first_name} {user.users.last_name}
            </Text>
          ))}
          <Text style={styles.usersTitle}>Purchased Users:</Text>
          {purchasedUsers.map((user) => (
            <Text key={user.id} style={styles.userName}>
              {user.users.first_name} {user.users.last_name}
            </Text>
          ))}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buyButton} onPress={handleBuyTicket}>
          <Text style={styles.buyButtonText}>BUY TICKET</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.interestedButton}
          onPress={handleInterested}
        >
          <Text style={styles.interestedButtonText}>INTERESTED</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Oswald_400Regular',
  },
  imageContainer: {
    width: '100%',
    height: 590, // Fixed height instead of percentage
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: 24,
  },
  eventDate: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: '#FF5252',
    marginBottom: 8,
  },
  eventName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 18,
    color: '#B0B0B0',
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buyButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  buyButtonText: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  interestedButton: {
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  interestedButtonText: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  usersContainer: {
    padding: 24,
  },
  usersTitle: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 8,
  },
  userName: {
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
});
