// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-expo';
import { Oswald_400Regular, useFonts } from '@expo-google-fonts/dev';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInRight,
  withSequence,
} from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;
const TICKETS_CACHE_KEY = 'tickets_cache';

const useTickets = (userId) => {
  const queryClient = useQueryClient();

  const fetchTickets = async () => {
    const isConnected = await NetInfo.fetch().then(
      (state) => state.isConnected
    );

    if (!isConnected) {
      const cachedTickets = await AsyncStorage.getItem(TICKETS_CACHE_KEY);
      return cachedTickets ? JSON.parse(cachedTickets) : [];
    }

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('clerk_id', userId)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('userevents')
        .select(`*, events(*)`)
        .eq('user_id', user.id)
        .eq('status', 'purchased');

      if (error) throw error;

      const ticketsWithUserInfo = data.map((ticket) => ({
        ...ticket,
        user_first_name: user.first_name,
        user_last_name: user.last_name,
      }));

      await AsyncStorage.setItem(
        TICKETS_CACHE_KEY,
        JSON.stringify(ticketsWithUserInfo)
      );

      return ticketsWithUserInfo;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  };

  return useQuery(['tickets', userId], fetchTickets, {
    enabled: !!userId,
  });
};

export default function TicketsScreen() {
  const { userId } = useAuth();
  const { data: tickets, isLoading, isError, refetch } = useTickets(userId);
  const router = useRouter();
  let [fontsLoaded] = useFonts({
    Oswald_400Regular,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        refetch();
      }
    });
    return () => unsubscribe();
  }, [refetch]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const goToDetails = useCallback(
    (ticket) => {
      router.push({
        pathname: '/ticket-details',
        params: {
          event_name: ticket.events.event_name,
          event_date: ticket.events.event_date,
          location: ticket.events.location,
          qr_code: ticket.qr_code,
          user_first_name: ticket.user_first_name,
          user_last_name: ticket.user_last_name,
        },
      });
    },
    [router]
  );

  const calculateDaysLeft = useCallback((eventDate) => {
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    const timeDiff = eventDateObj - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }, []);

  const renderTicket = useCallback(
    (item, index) => {
      const daysLeft = calculateDaysLeft(item.events.event_date);

      return (
        <Animated.View
          entering={FadeInRight.delay(index * 200).springify()}
          key={item.id}
          style={styles.ticketContainer}
        >
          <TouchableOpacity
            onPress={() => goToDetails(item)}
            activeOpacity={0.9}
            style={styles.ticketContent}
          >
            <View style={styles.grooveLeft} />
            <View style={styles.grooveRight} />
            <View style={styles.daysContainer}>
              <Text style={styles.daysText}>{daysLeft} MORE DAYS</Text>
            </View>
            <View style={styles.ticketContentInner}>
              <View style={styles.textContainer}>
                <Text style={styles.eventName}>{item.events.event_name}</Text>
                <Text style={styles.eventDetails}>
                  <Text style={styles.eventDate}>
                    {new Date(item.events.event_date).toLocaleDateString()}
                  </Text>{' '}
                  - {item.events.location}
                </Text>
              </View>
              <Image
                source={{ uri: item.events.image_url }}
                style={styles.eventImage}
              />
            </View>
            <View style={styles.dottedLine} />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [calculateDaysLeft, goToDetails]
  );

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading tickets</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Tickets</Text>
      <ScrollView
        contentContainerStyle={styles.ticketsContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#FF5252']}
          />
        }
      >
        {tickets && tickets.map((ticket, index) => renderTicket(ticket, index))}
      </ScrollView>
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
  loadingText: {
    color: '#FF5252',
    fontSize: 18,
    fontFamily: 'Oswald_400Regular',
    marginTop: 10,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 18,
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
  },
  header: {
    fontSize: 35,
    color: '#FF5252',
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
    marginVertical: 20,
  },
  ticketsContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  ticketContainer: {
    marginBottom: 15,
  },
  ticketContent: {
    backgroundColor: '#333333',
    borderRadius: 15,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  ticketContentInner: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  grooveLeft: {
    position: 'absolute',
    left: -15,
    top: '35%',
    width: 25,
    height: 25,
    backgroundColor: '#000000',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    zIndex: 1,
  },
  grooveRight: {
    position: 'absolute',
    right: -15,
    top: '35%',
    width: 25,
    height: 25,
    backgroundColor: '#000000',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    zIndex: 1,
  },
  daysContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    backgroundColor: '#d3d3d3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  daysText: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#000000',
  },
  textContainer: {
    flex: 1,
  },
  eventName: {
    fontSize: 20,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  eventDetails: {
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
  },
  eventDate: {
    color: '#FF5252',
  },
  dottedLine: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    zIndex: 0,
  },
  eventImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginLeft: 10,
  },
});
