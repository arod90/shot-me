//@ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';
import { useAuth } from '@clerk/clerk-expo';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Oswald_400Regular, useFonts } from '@expo-google-fonts/dev';
import { Ionicons } from '@expo/vector-icons';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const CARD_COLORS = ['#E0E0E0', '#D0D0D0', '#C0C0C0', '#B0B0B0', '#A0A0A0'];

export default function TicketsScreen() {
  const [tickets, setTickets] = useState([]);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const { ticketId, message } = useLocalSearchParams();
  const { userId } = useAuth();
  const animatedValues = useRef({}).current;
  const animatedOpacities = useRef({}).current;

  let [fontsLoaded] = useFonts({
    Oswald_400Regular,
  });

  useEffect(() => {
    fetchTickets();
  }, [ticketId, message]);

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

      ticketsWithUserInfo.forEach((ticket) => {
        if (!animatedValues[ticket.id]) {
          animatedValues[ticket.id] = new Animated.Value(0);
          animatedOpacities[ticket.id] = new Animated.Value(1);
        }
      });

      setTickets(ticketsWithUserInfo);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const toggleTicket = (id) => {
    if (expandedTicket === id) {
      Animated.parallel([
        ...Object.keys(animatedValues).map((key) =>
          Animated.timing(animatedValues[key], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          })
        ),
        ...Object.keys(animatedOpacities).map((key) =>
          Animated.timing(animatedOpacities[key], {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          })
        ),
      ]).start(() => setExpandedTicket(null));
    } else {
      setExpandedTicket(id);
      Animated.parallel([
        ...Object.keys(animatedValues).map((key) =>
          Animated.timing(animatedValues[key], {
            toValue: key === id ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
          })
        ),
        ...Object.keys(animatedOpacities).map((key) =>
          Animated.timing(animatedOpacities[key], {
            toValue: key === id ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
          })
        ),
      ]).start();
    }
  };
  const renderTicket = (item, index) => {
    const isExpanded = expandedTicket === item.id;
    const cardColor = CARD_COLORS[index % CARD_COLORS.length];

    const animatedStyle = {
      height: animatedValues[item.id].interpolate({
        inputRange: [0, 1],
        outputRange: [250, screenHeight - 180],
      }),
      top: animatedValues[item.id].interpolate({
        inputRange: [0, 1],
        outputRange: [index * 90, 0],
      }),
      opacity: animatedOpacities[item.id],
      zIndex: isExpanded ? tickets.length + 1 : index,
    };

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.ticketContainer,
          { backgroundColor: cardColor },
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => toggleTicket(item.id)}
          activeOpacity={0.9}
        >
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
          >
            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.qrContainer}>
                  <QRCode value={item.qr_code} size={300} />
                  <Text
                    style={styles.ownerName}
                  >{`${item.user_first_name} ${item.user_last_name}`}</Text>
                </View>
              </View>
            )}
          </ImageBackground>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Tickets</Text>
      <View style={styles.ticketsContainer}>
        {[...tickets]
          .reverse()
          .map((ticket, index) =>
            renderTicket(ticket, tickets.length - 1 - index)
          )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    fontSize: 30,
    color: '#FF5252',
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
    marginVertical: 20,
  },
  ticketsContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  ticketContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    height: 80, // Increased from 70 to 80 to show more of the header
  },
  eventName: {
    fontSize: 20,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
  },
  eventDate: {
    fontSize: 16,
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
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    marginLeft: 5,
  },
  ticketBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  expandedContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 40,
  },
  qrContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 20,
  },
  ownerName: {
    marginTop: 10,
    fontSize: 18,
    fontFamily: 'Oswald_400Regular',
    color: '#000000',
  },
});
