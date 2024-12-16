import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth, useUser } from '@clerk/clerk-expo';

export default function MockPayment() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const { userId } = useAuth();
  const { user } = useUser();

  const handlePayment = async () => {
    try {
      console.log('Starting payment process');

      // Fetch or create user in our database
      let { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.log('User fetch error:', userError);
        if (userError.code === 'PGRST116') {
          console.log('User not found, creating new user');
          // User doesn't exist, create them
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              clerk_id: userId,
              email: user.primaryEmailAddress?.emailAddress || '',
              first_name: user.firstName || '',
              last_name: user.lastName || '',
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            throw createError;
          }
          dbUser = newUser;
        } else {
          throw userError;
        }
      }

      console.log('User:', dbUser);

      // Generate QR code (you might want to use a library for this in a real app)
      const qrCode = `TICKET-${dbUser.id}-${eventId}-${Date.now()}`;

      // Mock ticket price
      const ticketPrice = 50.0;

      console.log('Inserting user_event');
      // Insert or update UserEvents
      const { data, error } = await supabase
        .from('userevents')
        .upsert(
          {
            user_id: dbUser.id,
            event_id: eventId,
            status: 'purchased',
            purchase_date: new Date().toISOString(),
            ticket_price: ticketPrice,
            qr_code: qrCode,
          },
          {
            onConflict: 'user_id,event_id',
            update: ['status', 'purchase_date', 'ticket_price', 'qr_code'],
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Error inserting user_event:', error);
        throw error;
      }

      console.log('Inserted user_event:', data);

      console.log('Updating user stats');
      // Update user's total_spent and events_attended
      const { error: statsError } = await supabase.rpc('update_user_stats', {
        user_id: dbUser.id,
        amount_spent: ticketPrice,
      });

      if (statsError) {
        console.error('Error updating user stats:', statsError);
        throw statsError;
      }

      console.log('Payment process completed successfully');

      // Navigate to tickets screen and reset the navigation stack
      router.replace({
        pathname: '/(tabs)/tickets',
      });
    } catch (error) {
      console.error('Detailed error in payment process:', error);
      alert(
        'Error processing payment. Please check the console for more details.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mock Payment</Text>
      <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
        <Text style={styles.payButtonText}>Complete Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
