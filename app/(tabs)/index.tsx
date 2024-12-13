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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import Modal from 'react-native-modal';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_600SemiBold,
  BebasNeue_400Regular,
} from '@expo-google-fonts/dev';

const EVENTS_CACHE_KEY = 'events_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export default function EventsScreen() {
  let [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_600SemiBold,
    BebasNeue_400Regular,
  });
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [animated, setAnimated] = useState(false);
  const animatedValues = useRef({}).current;

  const { data: venues = [] } = useQuery(['venues'], fetchVenues);
  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery(['events', selectedVenue], () => fetchEvents(selectedVenue));

  async function fetchVenues() {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data;
  }

  async function fetchEvents(venueId) {
    const cachedData = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return venueId
          ? data.filter((event) => event.venue_id === venueId)
          : data;
      }
    }

    let query = supabase
      .from('events')
      .select(
        `
      *,
      venues (
        id,
        name
      )
    `
      )
      .gte('event_date', new Date().toISOString()); // Only fetch upcoming events

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data: Events, error } = await query.order('event_date', {
      ascending: true,
    });

    if (error) throw error;

    await AsyncStorage.setItem(
      EVENTS_CACHE_KEY,
      JSON.stringify({
        data: Events,
        timestamp: Date.now(),
      })
    );

    return Events;
  }

  useEffect(() => {
    if (events?.length > 0) {
      events.forEach((event) => {
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
      events.forEach((event, index) => {
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
    }
  }, [events]);

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
            <Text style={styles.eventLocation}>
              {item.venues ? item.venues.name : item.location}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Link>
    ),
    [getAnimatedStyle]
  );

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Error loading events</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Events</Text>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.venueSelector}
          onPress={() => setShowVenueDropdown(true)}
        >
          <Text style={styles.venueSelectorText}>
            {selectedVenue
              ? venues?.find((v) => v.id === selectedVenue)?.name
              : 'All Venues'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <Modal
        isVisible={showVenueDropdown}
        onBackdropPress={() => setShowVenueDropdown(false)}
        onSwipeComplete={() => setShowVenueDropdown(false)}
        swipeDirection={['down']}
        style={styles.modal}
        propagateSwipe
        useNativeDriver
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={300}
        animationOutTiming={300}
        backdropTransitionInTiming={300}
        backdropTransitionOutTiming={300}
        hideModalContentWhileAnimating={true}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
          </View>
          <Text style={styles.modalTitle}>Select Venue</Text>
          <TouchableOpacity
            style={[styles.venueOption, !selectedVenue && styles.selectedVenue]}
            onPress={() => {
              setSelectedVenue(null);
              setShowVenueDropdown(false);
            }}
          >
            <Text
              style={[
                styles.venueOptionText,
                !selectedVenue && styles.selectedVenueText,
              ]}
            >
              All Venues
            </Text>
          </TouchableOpacity>
          {venues?.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={[
                styles.venueOption,
                selectedVenue === venue.id && styles.selectedVenue,
              ]}
              onPress={() => {
                setSelectedVenue(venue.id);
                setShowVenueDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.venueOptionText,
                  selectedVenue === venue.id && styles.selectedVenueText,
                ]}
              >
                {venue.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5252" />
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={['#FF5252']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No events found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    fontSize: 35,
    color: '#FF5252',
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
    marginVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Oswald_400Regular',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Oswald_400Regular',
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  venueSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  venueSelectorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  venueOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#262C36',
  },
  selectedVenue: {
    backgroundColor: '#FF5252',
  },
  venueOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  selectedVenueText: {
    fontWeight: '600',
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
    fontFamily: 'Oswald_400Regular',
    color: '#B0B0B0',
    fontSize: 18,
    marginLeft: 8,
  },
});
