import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [boats, setBoats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBoats();
  }, []);

  async function fetchBoats() {
    setLoading(true);
    const { data: boatData, error: boatErr } = await supabase
      .from('boats')
      .select('*, marinas(city, state)')
      .limit(50);

    if (!boatErr && boatData) {
      setBoats(boatData);
    }

    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setBoats([]); // Reset list state before fetching
    await fetchBoats();
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

  const renderBoat = ({ item, index }: { item: any; index: number }) => (
    <FadeInDownCard index={index}>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('BoatDetail', { id: item.id })}
      >
        <Image 
          source={{ uri: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13' }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.marinas?.city && item.marinas?.state && (
            <Text style={styles.cardLocation}>{item.marinas.city}, {item.marinas.state}</Text>
          )}
          <Text style={styles.cardPrice}>₹{item.daily_rate} / day</Text>
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
        <Text style={styles.header}>Available Boats</Text>
        {loading ? (
          <View style={styles.listContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <FlatList
            data={boats}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBoat}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No boats found.</Text>
            }
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
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
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
