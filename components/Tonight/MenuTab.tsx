import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface MenuTabProps {
  items: MenuItem[];
  onBuyItem?: (item: MenuItem) => void;
}

// @ts-ignore
export default function MenuTab({ items, onBuyItem }) {
  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>${item.price}</Text>
      <TouchableOpacity
        style={styles.buyButton}
        onPress={() => onBuyItem?.(item)}
      >
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
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
