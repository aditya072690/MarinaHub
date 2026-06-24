import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Linking, Modal, SafeAreaView, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

export default function TripsScreen() {
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [pastTrips, setPastTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

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
      .select('*, boats(name), marinas(name, slug, logo_url, timezone), customers!inner(user_id), reviews(rating), booking_addons(total_price, addon_catalog(name))')
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

  const payNow = async (bookingId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/stripe/checkout/resume`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      
      if (data.checkoutUrl) {
        Linking.openURL(data.checkoutUrl);
      } else {
        Alert.alert('Error', data.error || 'Could not resume payment');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
      fetchTrips(); // Refresh to update status if they return
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const renderTrip = ({ item }: { item: any }) => {
    const awaitingPayment = item.status === 'pending' && (item.payment_status === 'unpaid' || item.payment_status === 'pending');
    const hasTicket = item.ticket_token && item.marinas?.slug && item.payment_status === 'paid';

    return (
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
          <View style={[styles.statusBadge, awaitingPayment && styles.statusBadgeWarning]}>
            <Text style={[styles.statusText, awaitingPayment && styles.statusTextWarning]}>
              {awaitingPayment ? 'Payment Required' : item.status}
            </Text>
          </View>
          
          {item.status === 'completed' && item.reviews && item.reviews.length > 0 && (
            <Text style={styles.stars}>{'★'.repeat(item.reviews[0].rating)}{'☆'.repeat(5 - item.reviews[0].rating)}</Text>
          )}
        </View>

        <View style={{ marginTop: 16, flexDirection: 'column', gap: 12 }}>
          {awaitingPayment && (
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => payNow(item.id)}>
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Pay Now</Text>
            </TouchableOpacity>
          )}
          
          {hasTicket && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]} 
              onPress={() => setSelectedTicket(item)}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>View Ticket</Text>
            </TouchableOpacity>
          )}

          {item.status === 'confirmed' && new Date(item.start_at) > new Date() && (
            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={() => cancelBooking(item.id)}>
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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

      <Modal visible={!!selectedTicket} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTicket(null)}>
        <SafeAreaView style={styles.modalContainer}>
          {selectedTicket && (
            <ScrollView contentContainerStyle={styles.ticketContent}>
              <View style={styles.ticketCard}>
                <Text style={styles.ticketMarinaName}>{selectedTicket.marinas?.name || 'Marina Hub'}</Text>
                <Text style={styles.ticketSubtitle}>Digital Boarding Pass</Text>

                <View style={styles.ticketDivider} />

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Boat</Text>
                  <Text style={styles.ticketValue}>{selectedTicket.boats?.name}</Text>
                </View>
                
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Date</Text>
                  <Text style={styles.ticketValue}>
                    {new Date(selectedTicket.start_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Time</Text>
                  <Text style={styles.ticketValue}>
                    {new Date(selectedTicket.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedTicket.end_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Guests</Text>
                  <Text style={styles.ticketValue}>{selectedTicket.guest_count}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Booking ID</Text>
                  <Text style={styles.ticketValue}>{selectedTicket.id?.substring(0, 8).toUpperCase()}</Text>
                </View>
                
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Status</Text>
                  <Text style={[styles.statusText, { textTransform: 'capitalize' }]}>{selectedTicket.status}</Text>
                </View>

                <View style={styles.ticketDivider} />

                {selectedTicket.base_price > 0 && (
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Rental</Text>
                    <Text style={styles.ticketValue}>₹{selectedTicket.base_price}</Text>
                  </View>
                )}

                {selectedTicket.booking_addons?.map((addon: any, idx: number) => (
                  <View key={idx} style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>{addon.addon_catalog?.name || 'Add-on'}</Text>
                    <Text style={styles.ticketValue}>₹{addon.total_price}</Text>
                  </View>
                ))}

                {selectedTicket.tax_amount > 0 && (
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Tax</Text>
                    <Text style={styles.ticketValue}>₹{selectedTicket.tax_amount}</Text>
                  </View>
                )}

                <View style={[styles.ticketRow, { marginTop: 8 }]}>
                  <Text style={[styles.ticketLabel, { fontWeight: 'bold', color: '#0F172A' }]}>Total</Text>
                  <Text style={[styles.ticketValue, { fontWeight: 'bold' }]}>₹{selectedTicket.total_price}</Text>
                </View>

                <View style={styles.ticketDivider} />

                <View style={styles.qrContainerWrapper}>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={`${process.env.EXPO_PUBLIC_API_URL}/m/${selectedTicket.marinas?.slug}/booking/ticket/${selectedTicket.ticket_token}`}
                      size={180}
                    />
                  </View>
                  <Text style={styles.qrHelperText}>Scan to view this ticket</Text>
                </View>

              </View>

              <TouchableOpacity style={[styles.actionButton, styles.primaryButton, { width: '100%', marginTop: 24 }]} onPress={() => setSelectedTicket(null)}>
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Close Ticket</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  statusBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusTextWarning: {
    color: '#D97706',
  },
  stars: {
    color: '#EAB308',
    fontSize: 16,
  },
  actionButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#0F172A',
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#EF4444',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  ticketContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketMarinaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  ticketSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  ticketValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  qrContainerWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  qrHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});
