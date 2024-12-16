import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const [venue, setVenue] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  React.useEffect(() => {
    fetchVenueDetails();
  }, []);

  const fetchVenueDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setVenue(data);
    } catch (error) {
      console.error('Error fetching venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (venue?.phone) {
      Linking.openURL(`tel:${venue.phone}`);
    }
  };

  const handleDirections = async () => {
    if (venue?.latitude && venue?.longitude) {
      const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
      const url = Platform.select({
        ios: `${scheme}${venue.latitude},${venue.longitude}`,
        android: `${scheme}${venue.latitude},${venue.longitude}`,
      });
      await Linking.openURL(url);
    }
  };

  const handleSocialLink = (platform) => {
    const url = venue?.social_links?.[platform];
    if (url) {
      Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Image Carousel */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / Dimensions.get('window').width
            );
            setCurrentImageIndex(slideIndex);
          }}
        >
          {venue?.images?.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.venueImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <View style={styles.paginationDots}>
          {venue?.images?.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    currentImageIndex === index ? '#FF5252' : '#FFFFFF',
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.venueName}>{venue?.name}</Text>
        <Text style={styles.venueDescription}>{venue?.description}</Text>

        {/* Contact Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Ionicons name="call-outline" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDirections}
          >
            <Ionicons name="navigate-outline" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Address and Hours */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.infoText}>{venue?.address}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Hours of Operation</Text>
          {venue?.hours_of_operation &&
            Object.entries(venue.hours_of_operation).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayText}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                <Text style={styles.hoursText}>{hours}</Text>
              </View>
            ))}
        </View>

        {/* Map */}
        {venue?.latitude && venue?.longitude && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: venue.latitude,
                longitude: venue.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }}
                title={venue.name}
              />
            </MapView>
          </View>
        )}

        {/* Social Links */}
        <View style={styles.socialLinksContainer}>
          {venue?.social_links?.instagram && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('instagram')}
            >
              <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {venue?.social_links?.facebook && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('facebook')}
            >
              <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {venue?.social_links?.website && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('website')}
            >
              <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  venueImage: {
    width: Dimensions.get('window').width,
    height: 300,
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  contentContainer: {
    padding: 20,
  },
  venueName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'Oswald_600SemiBold',
  },
  venueDescription: {
    fontSize: 16,
    color: '#B0B0B0',
    marginBottom: 20,
    fontFamily: 'Oswald_400Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    width: '45%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'Oswald_600SemiBold',
  },
  infoText: {
    fontSize: 16,
    color: '#B0B0B0',
    fontFamily: 'Oswald_400Regular',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Oswald_400Regular',
  },
  hoursText: {
    fontSize: 16,
    color: '#B0B0B0',
    fontFamily: 'Oswald_400Regular',
  },
  mapContainer: {
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  socialButton: {
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
  },
});
