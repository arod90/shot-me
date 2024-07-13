// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_600SemiBold,
  BebasNeue_400Regular,
} from '@expo-google-fonts/dev';

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const router = useRouter();
  let [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      let { data: Events, error } = await supabase.from('Events').select('*');
      if (error) throw error;
      setEvents(Events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }

  const handleEventPress = (event) => {
    // Navigate immediately
    router.push(`/event-detail?id=${event.id}`);
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => handleEventPress(item)}
    >
      <Text style={styles.eventDate}>
        {new Date(item.event_date)
          .toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          .toUpperCase()}
      </Text>
      <Text style={styles.eventName}>{item.event_name.toUpperCase()}</Text>
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={24} color="#E53935" />
        <Text style={styles.eventLocation}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    padding: 24,
  },
  eventItem: {
    paddingVertical: 20, // Increased spacing between events
  },
  eventDate: {
    fontFamily: 'BebasNeue_400Regular',
    color: '#FF5252', // Slightly brighter red
    fontSize: 24, // Doubled size
    marginBottom: 8,
  },
  eventName: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 28, // 20% larger
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#B0B0B0',
    fontSize: 18, // A little bigger
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 16, // Increased spacing
  },
});
