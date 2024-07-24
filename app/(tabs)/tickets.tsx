// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Oswald_400Regular, useFonts } from '@expo-google-fonts/dev';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function TicketsScreen() {
  const [tickets, setTickets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  let [fontsLoaded] = useFonts({
    Oswald_400Regular,
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    if (!userId) return;

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('clerk_id', userId)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('userevents')
        .select(
          `
          *,
          events(*)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'purchased');

      if (error) throw error;

      const ticketsWithUserInfo = data.map((ticket) => ({
        ...ticket,
        user_first_name: user.first_name,
        user_last_name: user.last_name,
      }));

      setTickets(ticketsWithUserInfo);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets().then(() => setRefreshing(false));
  }, []);

  const goToDetails = (ticket) => {
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
  };

  const calculateDaysLeft = (eventDate) => {
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    const timeDiff = eventDateObj - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const renderTicket = (item, index) => {
    const daysLeft = calculateDaysLeft(item.events.event_date);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => goToDetails(item)}
        activeOpacity={0.9}
      >
        <View style={styles.ticketContainer}>
          <View style={styles.grooveLeft} />
          <View style={styles.grooveRight} />
          <View style={styles.daysContainer}>
            <Text style={styles.daysText}>{daysLeft} MORE DAYS</Text>
          </View>
          <View style={styles.ticketContent}>
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
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Tickets</Text>
      <ScrollView
        contentContainerStyle={styles.ticketsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF5252']}
          />
        }
      >
        {tickets.map((ticket, index) =>
          renderTicket(ticket, tickets.length - 1 - index)
        )}
      </ScrollView>
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
    marginVertical: 20,
  },
  ticketsContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  ticketContainer: {
    backgroundColor: '#333333',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  grooveLeft: {
    position: 'absolute',
    left: -15,
    top: '35%',
    width: 25,
    height: 25,
    backgroundColor: '#000000', // Match background to blend
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
    backgroundColor: '#000000', // Match background to blend
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
  ticketContent: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#FF5252', // Red color for the date
  },
  dottedLine: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dotted',
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
