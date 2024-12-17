// @ts-nocheck
import React from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import defaultLogo from '../../assets/images/logo-blanco.png';

interface Person {
  id: string;
  users: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface PeopleTabProps {
  checkedInPeople: Person[];
}

export default function PeopleTab({ checkedInPeople }) {
  const renderPerson = ({ item }: { item: Person }) => (
    <View style={styles.personContainer}>
      <Image
        source={
          item.users.avatar_url ? { uri: item.users.avatar_url } : defaultLogo
        }
        style={styles.avatar}
      />
      <Text style={styles.name}>
        {item.users.first_name} {item.users.last_name}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={checkedInPeople}
      renderItem={renderPerson}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  personContainer: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Oswald_400Regular',
  },
});
