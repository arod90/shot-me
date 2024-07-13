// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/supabase';
import {
  useFonts,
  Oswald_600SemiBold,
  Oswald_400Regular,
  BebasNeue_400Regular,
} from '@expo-google-fonts/dev';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  let [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    Oswald_400Regular,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  async function fetchEventDetails() {
    try {
      const { data, error } = await supabase
        .from('Events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!fontsLoaded) {
    return <Text style={styles.loadingText}>Loading...</Text>;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!event) {
    return (
      <Text style={styles.loadingText}>Failed to load event details.</Text>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.eventName}>{toTitleCase(event.event_name)}</Text>
          <Text style={styles.eventDate}>
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={24} color="#FF5252" />
            <Text style={styles.eventLocation}>{event.location}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => console.log('Buy ticket for:', event.id)}
        >
          <Text style={styles.buttonText}>Buy Ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.interestedButton}
          onPress={() => console.log('Interested in:', event.id)}
        >
          <Text style={styles.buttonText}>Interested</Text>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 21.6,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Oswald_400Regular',
  },
  imageContainer: {
    width: width,
    height: height * 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: 24,
  },
  eventName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 34.8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  eventDate: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 23.2,
    color: '#FF5252',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  eventLocation: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 21.6,
    color: '#B0B0B0',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#000000',
  },
  buyButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  interestedButton: {
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 19.2,
    fontWeight: 'bold',
  },
});
