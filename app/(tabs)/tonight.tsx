// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  FlatList,
  Animated,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
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

  // Real-time subscription references to clean up
  const timelineSubscriptionRef = useRef(null);
  const checkinsSubscriptionRef = useRef(null);
  const reactionsSubscriptionRef = useRef(null);

  useEffect(() => {
    fetchTodaysEvents();
    const eventsSubscription = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => fetchTodaysEvents()
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTimelineEvents();
      fetchCheckedInPeople();
      fetchMenuItems();

      // Clean up any existing subscriptions first
      if (timelineSubscriptionRef.current) {
        timelineSubscriptionRef.current.unsubscribe();
      }
      if (checkinsSubscriptionRef.current) {
        checkinsSubscriptionRef.current.unsubscribe();
      }
      if (reactionsSubscriptionRef.current) {
        reactionsSubscriptionRef.current.unsubscribe();
      }

      // Set up timeline events real-time subscription
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
          (payload) => {
            console.log('Timeline event change detected:', payload);
            fetchTimelineEvents();
          }
        )
        .subscribe();

      // Set up check-ins real-time subscription
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

      // Set up reactions real-time subscription
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

      // Store subscription references for cleanup
      timelineSubscriptionRef.current = timelineChannel;
      checkinsSubscriptionRef.current = checkinsChannel;
      reactionsSubscriptionRef.current = reactionsChannel;

      const cleanup = subscribeToUpdates();
      return () => {
        cleanup();
        // Unsubscribe from all channels when component unmounts
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
    }
  }, [selectedEvent]);

  const fetchTodaysEvents = async () => {
    const now = new Date();
    let startTime = new Date();
    let endTime = new Date();

    if (now.getHours() >= 0 && now.getHours() <= 15) {
      startTime.setDate(startTime.getDate() - 1);
      startTime.setHours(18, 0, 0, 0);
      endTime.setHours(15, 0, 0, 0);
    } else {
      startTime.setHours(18, 0, 0, 0);
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(15, 0, 0, 0);
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startTime.toISOString())
        .lte('event_date', endTime.toISOString())
        .order('event_date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
      if (data?.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
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

      // Fetch reactions for each timeline event in parallel
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
            created_at: new Date(event.created_at).getTime(), // Ensure we have a consistent timestamp
            // Add a unique identifier for more precise comparison
            uniqueKey: `${event.id}-${event.created_at}`,
          };
        })
      );

      // Sort events by creation time to ensure correct order
      const sortedEvents = eventsWithReactions.sort(
        (a, b) => b.created_at - a.created_at
      );

      // Only update if there are actual changes
      setTimelineEvents((prevEvents) => {
        // Add more detailed logging for debugging
        console.log('Previous Events:', prevEvents);
        console.log('New Events:', sortedEvents);

        // Use a more robust comparison method
        const hasChanges =
          prevEvents.length !== sortedEvents.length ||
          sortedEvents.some(
            (newEvent, index) =>
              !prevEvents[index] ||
              newEvent.uniqueKey !== prevEvents[index].uniqueKey
          );

        console.log('Has Changes:', hasChanges);

        return hasChanges ? sortedEvents : prevEvents;
      });
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    }
  };

  const fetchCheckedInPeople = async () => {
    if (!selectedEvent) return;
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select(` id, users ( first_name, last_name, avatar_url ) `)
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

  const subscribeToUpdates = () => {
    if (!selectedEvent) return () => {};

    // Real-time subscription for timeline updates
    const timelineSubscription = supabase
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

    return () => {
      timelineSubscription.unsubscribe();
    };
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({
          event_id: selectedEvent.id,
          description: announcement,
          event_type: 'announcement',
          event_category: 'announcement',
        })
        .select(); // Add .select() to return the inserted data

      if (error) throw error;

      console.log('Announcement inserted:', data);
      setAnnouncement('');

      // Explicitly fetch timeline events after insertion
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding announcement:', error);
      Alert.alert('Error', 'Failed to add announcement');
    }
  };

  const getCurrentDateWithTime = (timeString) => {
    const today = new Date();
    const [hours, minutes] = timeString.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today.toISOString();
  };

  const handleAddSetTime = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({
          event_id: selectedEvent.id,
          description: setTime.description,
          event_type: 'set_time',
          event_category: 'set_time',
          scheduled_for: setTime.scheduledTime,
          is_scheduled: true,
        })
        .select(); // Add .select() to return the inserted data

      if (error) throw error;

      console.log('Set time inserted:', data);
      setSetTime({ description: '', scheduledTime: '' });

      // Explicitly fetch timeline events after insertion
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding set time:', error);
      Alert.alert('Error', 'Failed to add set time');
    }
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
      } else {
        fetchTimelineEvents();
      }
    }
  };

  const handleEditTimelineEvent = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({
          description: editingEvent.description,
          scheduled_for:
            editingEvent.event_category === 'set_time'
              ? editingEvent.scheduled_for
              : null,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      setEditingEvent(null);
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const measureTimelineHeight = () => {
    if (timelineRef.current) {
      timelineRef.current.measure((x, y, width, height, pageX, pageY) => {
        const newHeight = height + 100;
        Animated.timing(lineHeightAnim, {
          toValue: newHeight,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  if (!selectedEvent) {
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
          <FlatList
            data={timelineEvents}
            renderItem={({ item }) => (
              <TimelineItem
                item={item}
                userId={userId}
                onReactionUpdate={fetchTimelineEvents}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.timelineContainer}
          />
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
    // paddingBottom: 100,
  },
  timelineLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#FFFFFF',
    left: '50%',
    transform: [{ translateX: -1 }],
    top: 0,
    bottom: 0,
  },
  timelineContainer: {
    paddingVertical: 20,
  },
});

export default Tonight;
