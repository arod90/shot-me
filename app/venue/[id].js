import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
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

  const handleDirections = () => {
    if (venue?.address) {
      const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(venue.address)}`,
        android: `geo:0,0?q=${encodeURIComponent(venue.address)}`,
      });
      Linking.openURL(url);
    }
  };

  // const handleSocialLink = (platform) => {
  //   const link = venue?.social_links?.[platform];
  //   if (link) {
  //     let url = link;
  //     switch (platform) {
  //       case 'instagram':
  //         url = `https://instagram.com/${link}`;
  //         break;
  //       case 'twitter':
  //         url = `https://twitter.com/${link}`;
  //         break;
  //       case 'facebook':
  //         url = link.startsWith('http') ? link : `https://${link}`;
  //         break;
  //       case 'website':
  //         url = link.startsWith('http') ? link : `https://${link}`;
  //         break;
  //     }
  //     Linking.openURL(url);
  //   }
  // };

  const handleSocialLink = (platform) => {
    const link = venue?.social_links?.[platform];
    if (link) {
      let appUrl = '';
      let fallbackUrl = '';

      switch (platform) {
        case 'instagram':
          appUrl = `instagram://user?username=${link}`;
          fallbackUrl = `https://instagram.com/${link}`;
          break;
        case 'twitter':
          appUrl = `twitter://user?screen_name=${link}`;
          fallbackUrl = `https://twitter.com/${link}`;
          break;
        case 'facebook':
          appUrl = `fb://facewebmodal/f?href=https://facebook.com/${link}`;
          fallbackUrl = link.startsWith('http') ? link : `https://${link}`;
          break;
        case 'website':
          fallbackUrl = link.startsWith('http') ? link : `https://${link}`;
          break;
      }

      // Try to open the app URL first; fallback to the web URL if the app isn't installed
      Linking.canOpenURL(appUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(appUrl);
          } else if (fallbackUrl) {
            Linking.openURL(fallbackUrl);
          } else {
            console.error('No valid URL to open');
          }
        })
        .catch((err) => console.error('Error opening link:', err));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Venue not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / Dimensions.get('window').width
            );
            setCurrentImageIndex(index);
          }}
        >
          {venue.images?.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.venueImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <View style={styles.paginationDots}>
          {venue.images?.map((_, index) => (
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
        <Text style={styles.venueName}>{venue.name}</Text>

        <View style={styles.infoSection}>
          {/* <Text style={styles.sectionTitle}>Description</Text> */}
          <View style={styles.hoursRow}>
            <Text style={styles.hoursText}>{venue.description}</Text>
          </View>
        </View>

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

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Hours</Text>
          {venue.hours_of_operation &&
            Object.entries(venue.hours_of_operation).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayText}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                <Text style={styles.hoursText}>{hours}</Text>
              </View>
            ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.addressText}>{venue.address}</Text>
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

        <View style={styles.socialLinksContainer}>
          {venue.social_links?.instagram && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('instagram')}
            >
              <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {venue.social_links?.facebook && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('facebook')}
            >
              <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {venue.social_links?.twitter && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLink('twitter')}
            >
              <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {venue.social_links?.website && (
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
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
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    padding: 20,
  },
  venueName: {
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Oswald_600SemiBold',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
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
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'Oswald_600SemiBold',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  hoursText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  addressText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontFamily: 'Oswald_400Regular',
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
  },
});
