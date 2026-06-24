import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'BoatDetail'>;

export default function BoatDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [boat, setBoat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchBoatDetails();
  }, [id]);

  async function fetchBoatDetails() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    setUserId(uid);

    const { data } = await supabase.from('boats').select('*').eq('id', id).single();
    if (data) setBoat(data);

    if (uid && data) {
      const { data: favData } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', uid)
        .eq('boat_id', id)
        .maybeSingle();
      
      if (favData) setIsFavorited(true);
    }

    setLoading(false);
  }

  const toggleFavorite = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to save favorites.');
      return;
    }
    
    if (!boat?.marina_id) return;

    if (isFavorited) {
      setIsFavorited(false);
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('boat_id', id);
    } else {
      setIsFavorited(true);
      await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          boat_id: id,
          marina_id: boat.marina_id
        });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!boat) {
    return (
      <View style={styles.center}>
        <Text>Boat not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {(boat.image_urls || ['https://images.unsplash.com/photo-1540946485063-a40da27545f8']).map((url: string, index: number) => (
            <Image 
              key={index}
              source={{ uri: url }} 
              style={styles.galleryImage} 
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ))}
        </ScrollView>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{boat.name}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteBtn}>
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={28} 
                color={isFavorited ? "#EF4444" : "#0F172A"} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.price}>₹{boat.daily_rate} / day</Text>
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{boat.description || 'Enjoy a wonderful time on the water with this beautiful boat. Perfect for families and friends.'}</Text>
          
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {(boat.amenities || ['Life Jackets', 'Bluetooth Audio', 'Cooler']).map((amenity: string, idx: number) => (
              <View key={idx} style={styles.amenityBadge}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('Booking', { 
            screen: 'Step1_Schedule', 
            params: { boatId: boat.id } 
          })}
        >
          <Text style={styles.bookButtonText}>Select Dates</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 24,
  },
  gallery: {
    width: '100%',
    height: 300,
    backgroundColor: '#E2E8F0',
  },
  galleryImage: {
    width: 400, // Roughly screen width
    height: 300,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    paddingRight: 16,
  },
  favoriteBtn: {
    padding: 4,
  },
  price: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  bookButton: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
