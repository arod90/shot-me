// @ts-nocheck
'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { format, addHours, subHours, isWithinInterval } from 'date-fns';
import defaultLogo from '../../assets/images/logo-blanco.png';
import { useAuth } from '@clerk/clerk-expo';
import TimelineItem from '../../components/Timeline/TimelineItem';
import TimelineLine from '../../components/Timeline/TimelineLine';
import PeopleTab from '../../components/Tonight/PeopleTab';
import MenuTab from '../../components/Tonight/MenuTab';

export default function Tonight() {
  const { userId } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [setTime, setSetTime] = useState({
    description: '',
    scheduledTime: '',
  });
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [timelineHeight, setTimelineHeight] = useState(0);
  const [activeSection, setActiveSection] = useState('timeline');
  const [checkedInPeople, setCheckedInPeople] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const timelineRef = useRef(null);
  const lineHeightAnim = useRef(new Animated.Value(0)).current;
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const timelineSubscriptionRef = useRef(null);
  const checkinsSubscriptionRef = useRef(null);
  const reactionsSubscriptionRef = useRef(null);

  useEffect(() => {
    checkUserCheckedIn();

    const subscription = supabase
      .channel('checkins-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins' },
        () => {
          checkUserCheckedIn();
        }
      )
      .subscribe();

    const usereventsSubscription = supabase
      .channel('userevents-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'userevents' },
        () => {
          checkUserCheckedIn();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      usereventsSubscription.unsubscribe();
      if (timelineSubscriptionRef.current) {
        timelineSubscriptionRef.current.unsubscribe();
      }
      if (checkinsSubscriptionRef.current) {
        checkinsSubscriptionRef.current.unsubscribe();
      }
      if (reactionsSubscriptionRef.current) {
        reactionsSubscriptionRef.current.unsubscribe();
      }
    };
  }, [userId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchTimelineEvents();
      fetchCheckedInPeople();
      fetchMenuItems();
    }
  }, [selectedEvent]);

  const checkUserCheckedIn = async () => {
    if (!userId) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      const now = new Date();

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      const activeEvent = events?.find((event) => {
        const eventDate = new Date(event.event_date);
        const eventWindow = {
          start: subHours(eventDate, 2),
          end: addHours(eventDate, 36),
        };
        return isWithinInterval(now, eventWindow);
      });

      if (activeEvent) {
        const { data: checkIn } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', userData.id)
          .eq('event_id', activeEvent.id)
          .single();

        if (checkIn) {
          setIsCheckedIn(true);
          setSelectedEvent(activeEvent);
          fetchTimelineEvents();
          fetchCheckedInPeople();
          fetchMenuItems();
        } else {
          setIsCheckedIn(false);
          setSelectedEvent(null);
        }
      } else {
        setIsCheckedIn(false);
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Error checking user check-in:', error);
      setIsCheckedIn(false);
      setSelectedEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineEvents = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select(
          `
          *,
          users (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq('event_id', selectedEvent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const eventsWithReactions = await Promise.all(
        data.map(async (event) => {
          const { data: reactions } = await supabase
            .from('timeline_event_reactions')
            .select('reaction')
            .eq('timeline_event_id', event.id);

          const reactionCounts = reactions?.reduce((acc, curr) => {
            acc[curr.reaction] = (acc[curr.reaction] || 0) + 1;
            return acc;
          }, {});

          return {
            ...event,
            reactions: reactionCounts || {},
            created_at: new Date(event.created_at).getTime(),
            uniqueKey: `${event.id}-${event.created_at}`,
          };
        })
      );

      setTimelineEvents(eventsWithReactions);

      // Set up subscriptions for real-time updates
      setupSubscriptions();
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    }
  };

  const setupSubscriptions = () => {
    if (!selectedEvent) return;

    // Timeline events subscription
    if (!timelineSubscriptionRef.current) {
      const timelineChannel = supabase
        .channel(`timeline-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_events',
            filter: `event_id=eq.${selectedEvent.id}`,
          },
          () => fetchTimelineEvents()
        )
        .subscribe();

      timelineSubscriptionRef.current = timelineChannel;
    }

    // Check-ins subscription
    if (!checkinsSubscriptionRef.current) {
      const checkinsChannel = supabase
        .channel(`checkins-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checkins',
            filter: `event_id=eq.${selectedEvent.id}`,
          },
          () => {
            fetchTimelineEvents();
            fetchCheckedInPeople();
          }
        )
        .subscribe();

      checkinsSubscriptionRef.current = checkinsChannel;
    }

    // Reactions subscription
    if (!reactionsSubscriptionRef.current) {
      const reactionsChannel = supabase
        .channel(`reactions-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_event_reactions',
          },
          () => fetchTimelineEvents()
        )
        .subscribe();

      reactionsSubscriptionRef.current = reactionsChannel;
    }
  };

  const fetchCheckedInPeople = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('checkins')
        .select(
          `
          id,
          users (
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq('event_id', selectedEvent.id)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;
      setCheckedInPeople(data || []);
    } catch (error) {
      console.error('Error fetching checked in people:', error);
    }
  };

  const fetchMenuItems = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('event_id', selectedEvent.id)
        .eq('available', true);

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const measureTimelineHeight = () => {
    if (timelineRef.current) {
      timelineRef.current.measure((x, y, width, height, pageX, pageY) => {
        const newHeight = height + 100; // Add some padding
        Animated.timing(lineHeightAnim, {
          toValue: newHeight,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF5252" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isCheckedIn || !selectedEvent) {
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
        <Text style={styles.eventName}>{selectedEvent.event_name}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'timeline' && styles.activeTab]}
          onPress={() => setActiveSection('timeline')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'timeline' && styles.activeTabText,
            ]}
          >
            Timeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'people' && styles.activeTab]}
          onPress={() => setActiveSection('people')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'people' && styles.activeTabText,
            ]}
          >
            People
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'menu' && styles.activeTab]}
          onPress={() => setActiveSection('menu')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'menu' && styles.activeTabText,
            ]}
          >
            Menu
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'timeline' && (
        <View
          style={styles.timelineWrapper}
          ref={timelineRef}
          onLayout={measureTimelineHeight}
        >
          <TimelineLine height={lineHeightAnim} />
          <ScrollView contentContainerStyle={styles.timelineContainer}>
            {timelineEvents.map((item) => (
              <TimelineItem
                key={item.id}
                item={item}
                onReactionUpdate={fetchTimelineEvents}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {activeSection === 'people' && (
        <PeopleTab checkedInPeople={checkedInPeople} />
      )}

      {activeSection === 'menu' && <MenuTab items={menuItems} />}
    </SafeAreaView>
  );
}

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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#151B23',
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
    color: '#888888',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  timelineWrapper: {
    flex: 1,
    position: 'relative',
  },
  timelineContainer: {
    paddingVertical: 20,
  },
});
