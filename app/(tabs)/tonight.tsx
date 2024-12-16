// @ts-nocheck
'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const { height } = Dimensions.get('window');

const TonightTab = () => {
  const { userId } = useAuth();
  const [currentEvent, setCurrentEvent] = useState(null);
  const [checkedInUsers, setCheckedInUsers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [items, setItems] = useState([]);
  const [activeSection, setActiveSection] = useState('timeline');
  const lineAnimation = useRef(new Animated.Value(0)).current;
  const [timelineHeight, setTimelineHeight] = useState(height);

  useEffect(() => {
    checkUserCheckedIn();

    const subscription = supabase
      .channel('tonight_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRealtimeUpdate = (payload) => {
    if (currentEvent) {
      if (payload.table === 'checkins') {
        fetchCheckedInUsers(currentEvent.id);
      } else if (payload.table === 'timeline_events') {
        fetchTimeline(currentEvent.id);
      }
    }
  };

  const checkUserCheckedIn = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userData) {
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

        const { data: checkin } = await supabase
          .from('checkins')
          .select(
            `
            *,
            events (*)
            `
          )
          .eq('user_id', userData.id)
          .gte('checked_in_at', twelveHoursAgo.toISOString())
          .order('checked_in_at', { ascending: false })
          .limit(1)
          .single();

        if (checkin) {
          setCurrentEvent(checkin.events);
          fetchCheckedInUsers(checkin.event_id);
          fetchTimeline(checkin.event_id);
          fetchItems(checkin.event_id);
        }
      }
    } catch (error) {
      console.error('Error checking user check-in:', error);
    }
  };

  const fetchCheckedInUsers = async (eventId) => {
    const { data } = await supabase
      .from('checkins')
      .select(
        `
        *,
        users (id, first_name, last_name, avatar_url)
        `
      )
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false });

    setCheckedInUsers(data || []);
  };

  const fetchTimeline = async (eventId) => {
    const { data } = await supabase
      .from('timeline_events')
      .select(
        `
        *,
        users (id, first_name, last_name, avatar_url)
        `
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    setTimeline(data || []);
  };

  const fetchItems = async (eventId) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('event_id', eventId)
      .eq('available', true);

    setItems(data || []);
  };

  useEffect(() => {
    if (timeline.length > 0) {
      // Reset animation values
      lineAnimation.setValue(0);

      // Start the line drawing animation
      Animated.timing(lineAnimation, {
        toValue: timelineHeight,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }
  }, [timeline, timelineHeight]);

  const TimelineItemComponent = ({ item, index }) => {
    const nodeAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(nodeAnimation, {
        toValue: 1,
        duration: 500,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    }, [index, nodeAnimation]);

    return (
      <Animated.View
        style={[
          styles.timelineItem,
          {
            opacity: nodeAnimation,
            transform: [
              {
                translateY: nodeAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.timelineLeft}>
          <Text style={styles.timelineTime}>
            {format(new Date(item.created_at), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.timelineCenter}>
          <View style={styles.timelineNode}>
            <Image
              source={{ uri: item.users?.avatar_url }}
              style={styles.timelineAvatar}
            />
          </View>
        </View>
        <View style={styles.timelineRight}>
          <Text style={styles.timelineContent}>{item.description}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderTimelineItem = ({ item, index }) => {
    return <TimelineItemComponent item={item} index={index} />;
  };

  const TimelineLine = () => (
    <Animated.View
      style={[
        styles.timelineLine,
        {
          height: lineAnimation,
        },
      ]}
    />
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.message}>You're not checked in to any event</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eventName}>{currentEvent.event_name}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'timeline' && styles.activeTab]}
          onPress={() => setActiveSection('timeline')}
        >
          <Text style={styles.tabText}>Timeline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'people' && styles.activeTab]}
          onPress={() => setActiveSection('people')}
        >
          <Text style={styles.tabText}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'menu' && styles.activeTab]}
          onPress={() => setActiveSection('menu')}
        >
          <Text style={styles.tabText}>Menu</Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'timeline' && (
        <View
          style={styles.timelineWrapper}
          onLayout={(event) => {
            setTimelineHeight(event.nativeEvent.layout.height);
          }}
        >
          <TimelineLine />
          <FlatList
            data={timeline}
            renderItem={renderTimelineItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.timelineContainer}
          />
        </View>
      )}

      {activeSection === 'people' && (
        <FlatList
          data={checkedInUsers}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userItem}>
              <Image
                source={{ uri: item.users.avatar_url }}
                style={styles.userAvatar}
              />
              <Text style={styles.userName}>
                {item.users.first_name} {item.users.last_name}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.peopleContainer}
        />
      )}

      {activeSection === 'menu' && (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemCard}>
              <Image
                source={{ uri: item.image_url }}
                style={styles.itemImage}
              />
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price}</Text>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.menuContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  eventName: {
    fontSize: 35,
    color: '#FF5252',
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
  },
  timelineWrapper: {
    flex: 1,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#FFFFFF',
    left: '50%',
    transform: [{ translateX: -1 }], // This ensures the line is perfectly centered.
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    marginVertical: 10,
  },
  timelineLeft: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  timelineCenter: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  timelineAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 20,
  },
  timelineTime: {
    color: '#B0B0B0',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
  },
  timelineContent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5252',
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  timelineContainer: {
    paddingVertical: 20,
    // paddingHorizontal: 16,
  },
  timelineLineTop: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    height: 20,
    backgroundColor: '#FFFFFF',
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#FFFFFF',
    left: '50%',
    transform: [{ translateX: -1 }], // This ensures the line is perfectly centered.
  },

  userItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Oswald_400Regular',
  },
  peopleContainer: {
    padding: 16,
  },
  menuContainer: {
    padding: 16,
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    alignItems: 'center',
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'Oswald_400Regular',
  },
  itemPrice: {
    color: '#FF5252',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Oswald_400Regular',
  },
  buyButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
  },
});

export default TonightTab;
