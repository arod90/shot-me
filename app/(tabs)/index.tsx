// @ts-nocheck
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../supabase';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_600SemiBold,
  BebasNeue_400Regular,
} from '@expo-google-fonts/dev';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

const EVENTS_CACHE_KEY = 'events_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const useEvents = () => {
  const fetchEvents = async () => {
    const cachedData = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data;
      }
    }

    const { data: Events, error } = await supabase.from('events').select('*');
    if (error) throw error;

    const sortedEvents = Events.sort(
      (a, b) => new Date(a.event_date) - new Date(b.event_date)
    );

    await AsyncStorage.setItem(
      EVENTS_CACHE_KEY,
      JSON.stringify({ data: sortedEvents, timestamp: Date.now() })
    );
    return sortedEvents;
  };

  return useQuery(['events'], fetchEvents, {
    staleTime: CACHE_EXPIRY,
  });
};

export default function EventsScreen() {
  const { data: events, isLoading, isError, refetch } = useEvents();
  const [animated, setAnimated] = useState(false);
  const animatedValues = useRef({}).current;

  let [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    BebasNeue_400Regular,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const memoizedEvents = useMemo(() => events || [], [events]);

  const animateEvents = useCallback(
    (eventsData) => {
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
    },
    [animatedValues]
  );

  useEffect(() => {
    if (memoizedEvents.length > 0) {
      animateEvents(memoizedEvents);
    }
  }, [memoizedEvents, animateEvents]);

  const getAnimatedStyle = useCallback(
    (eventId, prop) => {
      const animValue =
        animatedValues[eventId]?.[prop] || new Animated.Value(1);
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
    },
    [animated, animatedValues]
  );

  const renderEvent = useCallback(
    ({ item }) => (
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
    ),
    [getAnimatedStyle]
  );

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading events</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={memoizedEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#FF5252']}
          />
        }
      />
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
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 18,
    fontFamily: 'Oswald_600SemiBold',
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
