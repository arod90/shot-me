import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [purchasedUsers, setPurchasedUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('purchased');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    fetchUsers();
  }, []);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert('Error', 'Unable to load event details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: interested, error: interestedError } = await supabase
        .from('userevents')
        .select(
          `
          *,
          users(first_name, last_name, avatar_url, date_of_birth, events_attended)
        `
        )
        .eq('event_id', id)
        .eq('status', 'interested');

      if (interestedError) throw interestedError;

      const { data: purchased, error: purchasedError } = await supabase
        .from('userevents')
        .select(
          `
          *,
          users(first_name, last_name, avatar_url, date_of_birth, events_attended)
        `
        )
        .eq('event_id', id)
        .eq('status', 'purchased');

      if (purchasedError) throw purchasedError;

      setInterestedUsers(interested);
      setPurchasedUsers(purchased);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleBuyTicket = () => {
    router.replace(`/mock-payment?eventId=${id}&userId=${userId}`);
  };

  const handleInterested = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }

      const { data: existingRecord, error: checkError } = await supabase
        .from('userevents')
        .select('*')
        .eq('user_id', userData.id)
        .eq('event_id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingRecord) {
        const { error } = await supabase.from('userevents').insert({
          user_id: userData.id,
          event_id: id,
          status: 'interested',
        });

        if (error) {
          console.error('Error inserting user_event:', error);
          throw error;
        }

        Alert.alert('Interested', 'You have marked this event as interested.');
      } else {
        Alert.alert(
          'Already Interested',
          'You have already marked this event as interested.'
        );
      }

      fetchUsers();
    } catch (error) {
      console.error('Error marking as interested:', error);
      Alert.alert('Error', 'Unable to mark as interested');
    }
  };

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item.users)}
    >
      <Image
        source={{
          uri: item.users.avatar_url || 'https://via.placeholder.com/40',
        }}
        style={styles.userAvatar}
      />
      <Text style={styles.userName}>
        {item.users.first_name} {item.users.last_name}
      </Text>
    </TouchableOpacity>
  );

  const renderUserModal = () => (
    <Modal
      isVisible={isModalVisible}
      onSwipeComplete={() => setModalVisible(false)}
      onBackdropPress={() => setModalVisible(false)}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={0}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Image
            source={{
              uri: selectedUser?.avatar_url || 'https://via.placeholder.com/80',
            }}
            style={styles.modalAvatar}
          />
          <Text style={styles.modalName}>
            {selectedUser?.first_name} {selectedUser?.last_name}
          </Text>
        </View>
        <View style={styles.modalInfo}>
          <View style={styles.modalInfoItem}>
            <Ionicons name="calendar-outline" size={24} color="#FF5252" />
            <Text style={styles.modalInfoText}>
              {selectedUser?.date_of_birth
                ? new Date(selectedUser.date_of_birth).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.modalInfoItem}>
            <Ionicons name="ticket-outline" size={24} color="#FF5252" />
            <Text style={styles.modalInfoText}>
              {selectedUser?.events_attended || 0} events attended
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!event) {
    return <Text style={styles.loadingText}>No event found</Text>;
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
          <Text style={styles.eventDate}>
            {new Date(event.event_date)
              .toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
              .toUpperCase()}
          </Text>
          <Text style={styles.eventName}>{event.event_name.toUpperCase()}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={24} color="#FF5252" />
            <Text style={styles.eventLocation}>{event.location}</Text>
          </View>

          <View style={styles.additionalDetailsContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>

            <Text style={styles.sectionTitle}>Lineup</Text>
            {event.lineup &&
              event.lineup.map((artist, index) => (
                <Text key={index} style={styles.lineupText}>
                  • {artist}
                </Text>
              ))}

            <Text style={styles.sectionTitle}>Price Tiers</Text>
            {event.price_tiers &&
              Object.entries(event.price_tiers).map(([tier, price], index) => (
                <Text key={index} style={styles.priceTierText}>
                  {tier}: ${price}
                </Text>
              ))}

            <Text style={styles.sectionTitle}>Dress Code</Text>
            <Text style={styles.dressCodeText}>{event.dress_code}</Text>
          </View>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchased' && styles.activeTab]}
            onPress={() => setActiveTab('purchased')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'purchased' && styles.activeTabText,
              ]}
            >
              Purchased
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'interested' && styles.activeTab]}
            onPress={() => setActiveTab('interested')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'interested' && styles.activeTabText,
              ]}
            >
              Interested
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={activeTab === 'purchased' ? purchasedUsers : interestedUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No users in this category</Text>
          }
          style={styles.userList}
          scrollEnabled={false}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buyButton} onPress={handleBuyTicket}>
          <Text style={styles.buyButtonText}>BUY TICKET</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.interestedButton}
          onPress={handleInterested}
        >
          <Text style={styles.interestedButtonText}>INTERESTED</Text>
        </TouchableOpacity>
      </View>
      {renderUserModal()}
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
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Oswald_400Regular',
  },
  imageContainer: {
    width: width,
    height: width,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: 24,
  },
  eventDate: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: '#FF5252',
    marginBottom: 8,
  },
  eventName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 18,
    color: '#B0B0B0',
    marginLeft: 8,
  },
  additionalDetailsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  descriptionText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 16,
    color: '#B0B0B0',
    marginBottom: 16,
  },
  lineupText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 16,
    color: '#B0B0B0',
    marginLeft: 16,
  },
  priceTierText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 16,
    color: '#B0B0B0',
    marginLeft: 16,
  },
  dressCodeText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 16,
    color: '#B0B0B0',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5252',
  },
  tabText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 18,
    color: '#B0B0B0',
  },
  activeTabText: {
    color: '#FF5252',
  },
  userList: {
    flexGrow: 0,
    marginTop: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    height: 60,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    fontSize: 18,
  },
  emptyListText: {
    fontFamily: 'Oswald_400Regular',
    color: '#B0B0B0',
    fontSize: 16,
    textAlign: 'center',
    padding: 24,
  },
  buttonContainer: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buyButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  buyButtonText: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  interestedButton: {
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  interestedButtonText: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  modalName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  modalInfo: {
    marginTop: 10,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalInfoText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
});
