import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, boats(id, name, daily_rate, image_urls)')
        .eq('user_id', session.user.id);

      if (!error && data) {
        setFavorites(data);
      }
    }
    setLoading(false);
  }

  const renderFavorite = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.boats?.image_urls?.[0] || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13' }}
        style={styles.boatImage}
        contentFit="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.boatName}>{item.boats?.name}</Text>
        <Text style={styles.price}>₹{item.boats?.daily_rate || 0} / day</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderFavorite}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You haven't saved any favorites yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  boatImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    padding: 16,
  },
  boatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 32,
  },
});
