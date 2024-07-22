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
import { supabase } from '../../supabase';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_600SemiBold,
  BebasNeue_400Regular,
} from '@expo-google-fonts/dev';

export default function EventsScreen() {
  const [events, setEvents] = useState([]);

  let [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      let { data: Events, error } = await supabase.from('events').select('*');
      if (error) throw error;
      setEvents(Events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }

  const renderEvent = ({ item }) => (
    <Link href={`/event-detail/${item.id}`} asChild>
      <TouchableOpacity style={styles.eventItem}>
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
          <Ionicons name="location-outline" size={20} color="#FF5252" />
          <Text style={styles.eventLocation}>{item.location}</Text>
        </View>
      </TouchableOpacity>
    </Link>
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  eventDate: {
    fontFamily: 'BebasNeue_400Regular',
    color: '#FF5252',
    fontSize: 24,
    marginBottom: 8,
  },
  eventName: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 28,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#B0B0B0',
    fontSize: 18,
    marginLeft: 8,
  },
});
