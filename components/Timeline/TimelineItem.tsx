// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { format } from 'date-fns';
import defaultLogo from '../../assets/images/logo-blanco.png';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-expo';

export default function TimelineItem({ item, onReactionUpdate }) {
  const { userId } = useAuth();
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [localReactions, setLocalReactions] = useState(item.reactions || {});
  const isAdminEvent =
    item.event_category === 'announcement' ||
    item.event_category === 'set_time';
  const longPressTimeout = React.useRef(null);

  useEffect(() => {
    // Update local reactions when item prop changes
    setLocalReactions(item.reactions || {});
  }, [item.reactions]);

  const showReactionOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', '❤️‍🔥', '🙌', '🍻', '👀', '🫡'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex !== 0) {
            await handleReaction(
              ['❤️‍🔥', '🙌', '🍻', '👀', '🫡'][buttonIndex - 1]
            );
          }
        }
      );
    } else {
      setShowReactionModal(true);
    }
  };

  const handleReaction = async (reaction) => {
    try {
      if (!userId) {
        console.error('Clerk User ID is undefined or null');
        return;
      }

      // Fetch the Supabase user ID based on the Clerk user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      const supabaseUserId = user.id;

      // Optimistic UI Update
      const updatedReactions = { ...localReactions };
      const existingReaction = Object.entries(localReactions).find(
        ([_, count]) => count > 0
      );

      // Decrement existing reaction if it exists
      if (existingReaction) {
        updatedReactions[existingReaction[0]]--;
        if (updatedReactions[existingReaction[0]] === 0) {
          delete updatedReactions[existingReaction[0]];
        }
      }

      // Increment new reaction
      updatedReactions[reaction] = (updatedReactions[reaction] || 0) + 1;
      setLocalReactions(updatedReactions);

      // Check for existing user reaction
      const { data: existingUserReaction, error: existingReactionError } =
        await supabase
          .from('timeline_event_reactions')
          .select('*')
          .eq('timeline_event_id', item.id)
          .eq('user_id', supabaseUserId)
          .maybeSingle();

      if (existingReactionError) {
        console.error(
          'Error fetching existing user reaction:',
          existingReactionError
        );
        return;
      }

      // If they're clicking the same reaction they already have, remove it
      if (existingUserReaction && existingUserReaction.reaction === reaction) {
        const { error: deleteError } = await supabase
          .from('timeline_event_reactions')
          .delete()
          .eq('id', existingUserReaction.id);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          // Revert optimistic update
          setLocalReactions(item.reactions || {});
          throw deleteError;
        }
      } else {
        // Either adding new reaction or changing existing one
        if (existingUserReaction) {
          // Update existing reaction
          const { error: updateError } = await supabase
            .from('timeline_event_reactions')
            .update({ reaction })
            .eq('id', existingUserReaction.id);

          if (updateError) {
            console.error('Error updating reaction:', updateError);
            // Revert optimistic update
            setLocalReactions(item.reactions || {});
            throw updateError;
          }
        } else {
          // Insert new reaction
          const { error: insertError } = await supabase
            .from('timeline_event_reactions')
            .insert({
              timeline_event_id: item.id,
              user_id: supabaseUserId,
              reaction,
            });

          if (insertError) {
            console.error('Error adding reaction:', insertError);
            // Revert optimistic update
            setLocalReactions(item.reactions || {});
            throw insertError;
          }
        }
      }

      setShowReactionModal(false);

      // Optional: Call parent component method to refetch or update
      onReactionUpdate && onReactionUpdate();
    } catch (error) {
      console.error('Error handling reaction:', error);
      Alert.alert('Error', 'Failed to update reaction');
    }
  };

  const handlePressIn = () => {
    longPressTimeout.current = setTimeout(() => {
      showReactionOptions();
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <Text style={styles.timelineTime}>
          {format(new Date(item.created_at), 'h:mm a')}
        </Text>
      </View>
      <View style={styles.timelineCenter}>
        <View style={styles.timelineNode}>
          <Image
            source={
              isAdminEvent
                ? defaultLogo
                : item.users?.avatar_url
                  ? { uri: item.users.avatar_url }
                  : defaultLogo
            }
            style={styles.timelineAvatar}
            resizeMode={isAdminEvent ? 'contain' : 'cover'}
          />
        </View>
      </View>
      <View style={styles.timelineRight}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.messageBubble,
            isAdminEvent ? styles.adminBubble : styles.userBubble,
          ]}
        >
          <Text
            style={[
              styles.timelineContent,
              isAdminEvent ? styles.adminText : styles.userText,
            ]}
          >
            {item.description}
          </Text>
          {item.scheduled_for && (
            <Text style={styles.scheduledTime}>
              {format(new Date(item.scheduled_for), 'h:mm a')}
            </Text>
          )}
          {localReactions && Object.entries(localReactions).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(localReactions).map(([reaction, count]) => (
                <View key={reaction} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{reaction}</Text>
                  <Text style={styles.reactionCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showReactionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReactionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionModal(false)}
        >
          <View style={styles.reactionModalContent}>
            {['❤️‍🔥', '🙌', '🍻', '👀', '🫡'].map((reaction) => (
              <TouchableOpacity
                key={reaction}
                style={styles.reactionOption}
                onPress={() => handleReaction(reaction)}
              >
                <Text style={styles.reactionEmoji}>{reaction}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
    marginVertical: 15,
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
    zIndex: 2,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 20,
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
    overflow: 'hidden',
  },
  timelineAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  timelineTime: {
    color: '#B0B0B0',
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 4,
    maxWidth: '85%',
    position: 'relative',
  },
  adminBubble: {
    backgroundColor: '#FF5252',
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#333333',
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  timelineContent: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
  },
  adminText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#FFFFFF',
  },
  scheduledTime: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    marginTop: 4,
    opacity: 0.8,
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: -16,
    right: -8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    zIndex: 1,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262C36',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionModalContent: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 16,
    padding: 12,
    gap: 16,
  },
  reactionOption: {
    padding: 8,
  },
});
