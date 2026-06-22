import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'MarinaDetail'>;

export default function MarinaDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [marina, setMarina] = useState<any>(null);
  const [boats, setBoats] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarinaDetails();
  }, [id]);

  async function fetchMarinaDetails() {
    setLoading(true);
    // Fetch Marina
    const { data: marinaData } = await supabase.from('marinas').select('id, name, city, state, settings, lat, lng').eq('id', id).single();
    if (marinaData) {
      setMarina({
        ...marinaData,
        location: `${marinaData.city}, ${marinaData.state}`,
        image_url: marinaData.settings?.hero_image_url || 'https://images.unsplash.com/photo-1574347781559-99e90eb0b3eb',
        description: marinaData.settings?.description || 'A beautiful, fully-equipped marina offering top-tier amenities for all your boating needs. Experience luxury and convenience on the water.',
      });
    }

    // Fetch associated boats
    const { data: boatsData } = await supabase.from('boats').select('*').eq('marina_id', id);
    if (boatsData) setBoats(boatsData);

    // Fetch reviews
    const { data: reviewsData } = await supabase.from('reviews').select('*, users(email)').eq('marina_id', id).limit(3);
    if (reviewsData) setReviews(reviewsData);

    setLoading(false);
  }

  function openDirections() {
    if (marina) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${marina.lat},${marina.lng}`;
      Linking.openURL(url);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!marina) {
    return (
      <View style={styles.center}>
        <Text>Marina not found.</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      <Image 
        source={{ uri: marina.image_url || 'https://images.unsplash.com/photo-1574347781559-99e90eb0b3eb' }} 
        style={styles.heroImage} 
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.header}>
        <Text style={styles.title}>{marina.name}</Text>
        <Text style={styles.location}>{marina.location}</Text>
        <TouchableOpacity style={styles.directionsBtn} onPress={openDirections}>
          <Text style={styles.directionsText}>Get Directions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{marina.description}</Text>
      </View>

      <View style={styles.weatherSection}>
        <Text style={styles.sectionTitle}>Current Weather</Text>
        <View style={styles.weatherCard}>
          <Text style={styles.weatherTemp}>28°C</Text>
          <Text style={styles.weatherDesc}>☀️ Sunny • Wind: 12 km/h NE</Text>
        </View>
      </View>

      {reviews.length > 0 && (
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
              <Text style={styles.reviewText}>"{review.comment}"</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 16 }]}>Available Boats</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={boats}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.boatCard}
            onPress={() => navigation.navigate('BoatDetail', { id: item.id })}
          >
            <Image 
              source={{ uri: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13' }}
              style={styles.boatImage}
              contentFit="cover"
            />
            <View style={styles.boatInfo}>
              <Text style={styles.boatName}>{item.name}</Text>
              <Text style={styles.boatCapacity}>Capacity: {item.capacity} people</Text>
              <Text style={styles.boatPrice}>₹{item.daily_rate} / day</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
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
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E2E8F0',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  directionsBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  directionsText: {
    color: '#0F172A',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  weatherSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  weatherCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0369A1',
  },
  weatherDesc: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
  },
  reviewsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCard: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  reviewRating: {
    color: '#EAB308',
    marginBottom: 4,
    fontSize: 16,
  },
  reviewText: {
    fontSize: 14,
    color: '#334155',
    fontStyle: 'italic',
  },
  list: {
    padding: 16,
  },
  boatCard: {
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
  boatInfo: {
    padding: 16,
  },
  boatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  boatCapacity: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  boatPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});
