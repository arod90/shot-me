import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Oswald_400Regular, useFonts } from '@expo-google-fonts/dev';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

export default function TicketDetailsScreen() {
  const {
    event_name,
    event_date,
    location,
    qr_code,
    user_first_name,
    user_last_name,
  } = useLocalSearchParams();

  let [fontsLoaded] = useFonts({
    Oswald_400Regular,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.ticketContainer}>
        <View style={styles.imageWrapper}>
          <ImageBackground
            source={{
              uri: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            }}
            style={styles.imageBackground}
            imageStyle={styles.imageStyle}
          >
            <LinearGradient
              colors={['transparent', '#333333']}
              style={styles.gradient}
            />
            <Text style={styles.eventName}>{event_name}</Text>
          </ImageBackground>
        </View>
        <View style={styles.ticketContent}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text
                style={styles.value}
              >{`${user_first_name} ${user_last_name}`}</Text>
              <Text style={styles.label}>Name</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.value}>
                {new Date(event_date).toLocaleDateString()}
              </Text>
              <Text style={styles.label}>Date</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.value}>{location}</Text>
              <Text style={styles.label}>Location</Text>
            </View>
          </View>
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode value={qr_code} size={200} />
            </View>
          </View>
        </View>
        <View style={styles.grooveLeft} />
        <View style={styles.grooveRight} />
        <View style={styles.dottedLine} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketContainer: {
    width: '90%',
    backgroundColor: '#333333',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  imageWrapper: {
    height: 250, // Reduced the height of the image
    overflow: 'hidden',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  imageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Adjust the height of the gradient to make the blur more noticeable
  },
  eventName: {
    fontSize: 32, // Increased font size
    fontFamily: 'Oswald_400Regular',
    color: '#FFFFFF',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginVertical: 10,
    marginLeft: 30,
  },
  ticketContent: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  column: {
    flex: 1,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 18, // Increased font size
    color: '#AAAAAA',
    fontFamily: 'Oswald_400Regular',
    marginTop: 5,
    marginLeft: 15,
  },
  value: {
    fontSize: 22, // Increased font size
    color: '#FFFFFF',
    fontFamily: 'Oswald_400Regular',
    fontWeight: 'bold',
    marginLeft: 15,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
  },
  grooveLeft: {
    position: 'absolute',
    left: -15, // Shifted to cover the border
    top: '59%', // Adjusted to align with the top line of the QR code
    width: 35, // Increased width
    height: 40, // Height to match the width
    backgroundColor: '#000000', // Changed to match the black background
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 100,
  },
  grooveRight: {
    position: 'absolute',
    right: -15, // Shifted to cover the border
    top: '59%', // Adjusted to align with the top line of the QR code
    width: 35, // Increased width
    height: 40, // Height to match the width
    backgroundColor: '#000000', // Changed to match the black background
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    zIndex: 100,
  },
  dottedLine: {
    position: 'absolute',
    top: '59%',
    left: 20,
    right: 20,
    borderTopWidth: 1,
    borderTopColor: '#AAAAAA',
    borderStyle: 'dotted',
    zIndex: 99,
  },
});
