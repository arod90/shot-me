// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
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
  const [refreshing, setRefreshing] = useState(false);
  const [animated, setAnimated] = useState(false);
  const animatedValues = useRef({}).current;

  let [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents().then(() => setRefreshing(false));
  }, []);

  async function fetchEvents() {
    try {
      let { data: Events, error } = await supabase.from('events').select('*');
      if (error) throw error;
      setEvents(Events || []);
      setAnimated(false);
      animateEvents(Events);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }

  const animateEvents = (eventsData) => {
    eventsData.forEach((event, index) => {
      if (!animatedValues[event.id]) {
        animatedValues[event.id] = {
          date: new Animated.Value(0),
          name: new Animated.Value(0),
          location: new Animated.Value(0),
        };
      } else {
        Object.values(animatedValues[event.id]).forEach((value) =>
          value.setValue(0)
        );
      }
    });

    setAnimated(true);

    eventsData.forEach((event, index) => {
      const delay = index * 100;
      ['date', 'name', 'location'].forEach((prop, propIndex) => {
        Animated.timing(animatedValues[event.id][prop], {
          toValue: 1,
          duration: 500,
          delay: delay + propIndex * 100,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const getAnimatedStyle = (eventId, prop) => {
    const animValue = animatedValues[eventId]?.[prop] || new Animated.Value(1);
    return {
      opacity: animated ? animValue : 0,
      transform: [
        {
          translateX: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          }),
        },
      ],
    };
  };

  const renderEvent = ({ item }) => (
    <Link href={`/event-detail/${item.id}`} asChild>
      <TouchableOpacity style={styles.eventItem}>
        <Animated.Text
          style={[styles.eventDate, getAnimatedStyle(item.id, 'date')]}
        >
          {new Date(item.event_date)
            .toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
            .toUpperCase()}
        </Animated.Text>
        <Animated.Text
          style={[styles.eventName, getAnimatedStyle(item.id, 'name')]}
        >
          {item.event_name.toUpperCase()}
        </Animated.Text>
        <Animated.View
          style={[
            styles.locationContainer,
            getAnimatedStyle(item.id, 'location'),
          ]}
        >
          <Ionicons name="location-outline" size={20} color="#FF5252" />
          <Text style={styles.eventLocation}>{item.location}</Text>
        </Animated.View>
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
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF5252']}
          />
        }
      />
    </SafeAreaView>
  );
}

// ... styles remain unchanged
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
