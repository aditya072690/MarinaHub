import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [marinas, setMarinas] = useState<any[]>([]);
  const [popularBoats, setPopularBoats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMarinas();
  }, []);

  async function fetchMarinas() {
    const { data: marinaData, error: marinaErr } = await supabase
      .from('marinas')
      .select('id, name, city, state, settings')
      .eq('is_active', true)
      .limit(10);
      
    if (marinaErr) {
      console.error(marinaErr);
    } else {
      const formattedMarinas = (marinaData || []).map(m => ({
        id: m.id,
        name: m.name,
        location: `${m.city}, ${m.state}`,
        image_url: m.settings?.hero_image_url || 'https://images.unsplash.com/photo-1574347781559-99e90eb0b3eb',
        rating: m.settings?.rating || '4.8',
      }));
      setMarinas(formattedMarinas);
    }

    const { data: boatData, error: boatErr } = await supabase
      .from('boats')
      .select('*')
      .limit(5);

    if (!boatErr && boatData) {
      setPopularBoats(boatData);
    }

    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setMarinas([]); // Reset list state before fetching
    setPopularBoats([]);
    await fetchMarinas();
    setRefreshing(false);
  }, []);

  const FadeInDownCard = ({ children, index }: { children: React.ReactNode, index: number }) => {
    const translateY = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        {children}
      </Animated.View>
    );
  };

  const renderMarina = ({ item, index }: { item: any; index: number }) => (
    <FadeInDownCard index={index}>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('MarinaDetail', { id: item.id })}
      >
        <Image 
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1574347781559-99e90eb0b3eb' }} 
          style={styles.cardImage} 
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardLocation}>{item.location}</Text>
          <Text style={styles.cardPrice}>★ {item.rating || 'New'}</Text>
        </View>
      </TouchableOpacity>
    </FadeInDownCard>
  );

  const renderPopularBoat = ({ item, index }: { item: any; index: number }) => (
    <FadeInDownCard index={index}>
      <TouchableOpacity 
        style={styles.boatCard}
        onPress={() => navigation.navigate('BoatDetail', { id: item.id })}
      >
        <Image 
          source={{ uri: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13' }}
          style={styles.boatCardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.boatCardContent}>
          <Text style={styles.boatCardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.boatCardPrice}>₹{item.daily_rate} / day</Text>
        </View>
      </TouchableOpacity>
    </FadeInDownCard>
  );

  const SkeletonCard = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
        ])
      ).start();
    }, []);

    return (
      <View style={styles.card}>
        <Animated.View style={[styles.cardImage, { backgroundColor: '#E2E8F0', opacity }]} />
        <View style={styles.cardContent}>
          <Animated.View style={{ height: 20, width: '60%', backgroundColor: '#E2E8F0', marginBottom: 8, borderRadius: 4, opacity }} />
          <Animated.View style={{ height: 16, width: '40%', backgroundColor: '#E2E8F0', marginBottom: 8, borderRadius: 4, opacity }} />
          <Animated.View style={{ height: 16, width: '20%', backgroundColor: '#E2E8F0', borderRadius: 4, opacity }} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <Text style={styles.header}>Featured Marinas</Text>
        {loading ? (
          <View style={styles.listContainer}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <FlatList
            data={marinas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMarina}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No marinas found.</Text>
            }
          />
        )}

        <Text style={[styles.header, { paddingTop: 0 }]}>Popular Boats</Text>
        {loading ? (
          <View style={[styles.listContainer, { flexDirection: 'row' }]}>
            <View style={[styles.boatCard, { width: 250, opacity: 0.5, backgroundColor: '#E2E8F0', height: 200 }]} />
            <View style={[styles.boatCard, { width: 250, opacity: 0.5, backgroundColor: '#E2E8F0', height: 200, marginLeft: 16 }]} />
          </View>
        ) : (
          <FlatList
            data={popularBoats}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPopularBoat}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.listContainer, { paddingRight: 32 }]}
            snapToInterval={266} // 250 width + 16 margin
            decelerationRate="fast"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    padding: 16,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EAB308',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 32,
  },
  boatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    width: 250,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  boatCardImage: {
    width: '100%',
    height: 140,
  },
  boatCardContent: {
    padding: 12,
  },
  boatCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  boatCardPrice: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
