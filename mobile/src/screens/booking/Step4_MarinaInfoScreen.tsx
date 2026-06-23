import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';
import { supabase } from '../../lib/supabase';
import { Image } from 'expo-image';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step4_MarinaInfo'>;

export default function Step4_MarinaInfoScreen({ navigation }: Props) {
  const { state } = useBookingContext();
  const [marina, setMarina] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarina() {
      // In a real app, this query might look different depending on schema
      // Assuming boats have a marina_id, let's just query it
      const { data: boatData } = await supabase
        .from('boats')
        .select('marina_id')
        .eq('id', state.boatId)
        .single();
        
      if (boatData?.marina_id) {
        const { data: marinaData } = await supabase
          .from('marinas')
          .select('*')
          .eq('id', boatData.marina_id)
          .single();
        setMarina(marinaData);
      }
      setLoading(false);
    }
    fetchMarina();
  }, [state.boatId]);

  const handleNext = () => {
    navigation.navigate('Step5_Weather');
  };

  const openMaps = () => {
    if (!marina) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marina.address || marina.name)}`;
    Linking.openURL(url);
  };

  const callMarina = () => {
    if (!marina?.phone) return;
    Linking.openURL(`tel:${marina.phone}`);
  };

  const emailMarina = () => {
    if (!marina?.email) return;
    Linking.openURL(`mailto:${marina.email}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Step 4 of 8</Text>
            <Text style={styles.title}>Marina Information</Text>
          </View>
        </View>

        {marina ? (
          <View style={styles.content}>
            <Image 
              source={{ uri: marina.image_url || 'https://images.unsplash.com/photo-1544256718-3bcf237f3974' }} 
              style={styles.marinaImage} 
              contentFit="cover" 
            />
            
            <View style={styles.infoCard}>
              <Text style={styles.marinaName}>{marina.name}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#64748B" />
                <Text style={styles.infoText}>{marina.address || `${marina.city}, ${marina.state}`}</Text>
              </View>

              {marina.hours && (
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color="#64748B" />
                  <Text style={styles.infoText}>{marina.hours}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={openMaps}>
                <View style={styles.actionIconBg}><Ionicons name="map" size={24} color="#3B82F6" /></View>
                <Text style={styles.actionText}>Directions</Text>
              </TouchableOpacity>
              
              {marina.phone && (
                <TouchableOpacity style={styles.actionBtn} onPress={callMarina}>
                  <View style={styles.actionIconBg}><Ionicons name="call" size={24} color="#10B981" /></View>
                  <Text style={styles.actionText}>Call</Text>
                </TouchableOpacity>
              )}

              {marina.email && (
                <TouchableOpacity style={styles.actionBtn} onPress={emailMarina}>
                  <View style={styles.actionIconBg}><Ionicons name="mail" size={24} color="#F59E0B" /></View>
                  <Text style={styles.actionText}>Email</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.noticeCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.noticeText}>Please arrive 15 minutes before your scheduled booking time for check-in and safety instructions.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.errorText}>Marina details could not be loaded.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Weather Check</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20 },
  marinaImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20 },
  infoCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  marinaName: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoText: { fontSize: 15, color: '#475569', flex: 1, lineHeight: 22 },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  actionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  noticeCard: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', gap: 12 },
  noticeText: { flex: 1, fontSize: 14, color: '#1E3A8A', lineHeight: 20 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginTop: 40 },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
