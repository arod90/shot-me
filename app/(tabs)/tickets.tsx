// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Oswald_400Regular, useFonts } from '@expo-google-fonts/dev';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const CARD_COLORS = ['#E0E0E0', '#D0D0D0', '#C0C0C0', '#B0B0B0', '#A0A0A0'];

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

  const renderTicket = (item, index) => {
    const cardColor = CARD_COLORS[index % CARD_COLORS.length];

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => goToDetails(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.ticketContainer, { backgroundColor: cardColor }]}>
          <View style={styles.ticketHeader}>
            <Text style={styles.eventName}>{item.events.event_name}</Text>
            <View>
              <Text style={styles.eventDate}>
                {new Date(item.events.event_date).toLocaleDateString()}
              </Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={20} color="#FF5252" />
                <Text style={styles.eventLocation}>{item.events.location}</Text>
              </View>
            </View>
          </View>
          <ImageBackground
            source={{ uri: item.events.image_url }}
            style={styles.ticketBackground}
            imageStyle={styles.imageStyle}
          />
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
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    height: 80,
  },
  eventName: {
    fontSize: 25,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
  },
  eventDate: {
    fontSize: 18,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  eventLocation: {
    fontSize: 18,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    marginLeft: 5,
  },
  ticketBackground: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});
