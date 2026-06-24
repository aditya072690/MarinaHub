import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TabParamList, 'Favorites'>;

export default function FavoritesScreen({ navigation }: Props) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
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
    setRefreshing(false);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites();
  }, []);

  const removeFavorite = async (boatId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('boat_id', boatId);
      
      setFavorites(prev => prev.filter(f => f.boat_id !== boatId));
    }
  };

  const renderFavorite = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('HomeStack', { screen: 'BoatDetail', params: { id: item.boat_id } })}
    >
      <Image 
        source={{ uri: item.boats?.image_urls?.[0] || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13' }}
        style={styles.boatImage}
        contentFit="cover"
      />
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.boatName}>{item.boats?.name}</Text>
          <TouchableOpacity onPress={() => removeFavorite(item.boat_id)} style={styles.favoriteBtn}>
            <Ionicons name="heart" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text style={styles.price}>₹{item.boats?.daily_rate || 0} / day</Text>
      </View>
    </TouchableOpacity>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  boatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    paddingRight: 16,
  },
  favoriteBtn: {
    padding: 4,
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
