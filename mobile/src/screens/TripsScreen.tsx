import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function TripsScreen() {
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [pastTrips, setPastTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrips();

    // Setup realtime subscription for all user's trips
    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        channel = supabase
          .channel('public:bookings')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
              // Re-fetch trips on any booking change (filter is handled by query)
              fetchTrips();
            }
          )
          .subscribe();
      }
    };
    
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTrips() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('*, boats(name), customers!inner(user_id), reviews(rating)')
      .eq('customers.user_id', session.user.id)
      .order('start_at', { ascending: false });

    if (!error && data) {
      const now = new Date();
      const upcoming = data.filter(d => new Date(d.start_at) >= now && d.status !== 'cancelled');
      const past = data.filter(d => new Date(d.start_at) < now || d.status === 'cancelled');
      setUpcomingTrips(upcoming);
      setPastTrips(past);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
        setLoading(true);
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
        fetchTrips();
      }}
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const renderTrip = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.boatName}>{item.boats?.name || 'Boat Booking'}</Text>
      <Text style={styles.bookingId}>Ref: {item.id?.substring(0, 8)}</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Dates:</Text>
        <Text style={styles.value}>
          {new Date(item.start_at).toLocaleDateString()} to {new Date(item.end_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Total:</Text>
        <Text style={styles.value}>₹{item.total_price}</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        
        {item.status === 'completed' && item.reviews && item.reviews.length > 0 && (
          <Text style={styles.stars}>{'★'.repeat(item.reviews[0].rating)}{'☆'.repeat(5 - item.reviews[0].rating)}</Text>
        )}
      </View>

      {item.status === 'confirmed' && new Date(item.start_at) > new Date() && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => cancelBooking(item.id)}>
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}
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
      <SectionList
        sections={[
          { title: 'Upcoming Trips', data: upcomingTrips },
          { title: 'Past Trips', data: pastTrips },
        ].filter(s => s.data.length > 0)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You have no upcoming or past trips.</Text>
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#0284C7',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  stars: {
    color: '#EAB308',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 32,
  },
});
