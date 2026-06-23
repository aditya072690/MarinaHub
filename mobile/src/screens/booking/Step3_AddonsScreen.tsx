import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step3_Addons'>;

const ADDON_PRICES = {
  tubeRental: 500,
  captainService: 2000,
  fuelPackage: 800,
  cooler: 300,
};

export default function Step3_AddonsScreen({ navigation }: Props) {
  const { state, updateState } = useBookingContext();
  
  const [addons, setAddons] = useState(state.addons);

  const toggleAddon = (key: keyof typeof ADDON_PRICES) => {
    setAddons(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculatePricing = () => {
    const diffMs = state.endDate.getTime() - state.startDate.getTime();
    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const baseTotal = state.pricing.baseRate * hours;
    
    let addonsTotal = 0;
    if (addons.tubeRental) addonsTotal += ADDON_PRICES.tubeRental;
    if (addons.captainService) addonsTotal += ADDON_PRICES.captainService;
    if (addons.fuelPackage) addonsTotal += ADDON_PRICES.fuelPackage;
    if (addons.cooler) addonsTotal += ADDON_PRICES.cooler;

    const subtotal = baseTotal + addonsTotal;
    const tax = subtotal * 0.18; // 18% GST (India)
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const handleNext = () => {
    const pricing = calculatePricing();
    
    updateState({
      addons,
      pricing: { ...state.pricing, ...pricing }
    });
    
    navigation.navigate('Step4_MarinaInfo');
  };

  const { total } = calculatePricing();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Step 3 of 8</Text>
            <Text style={styles.title}>Optional Add-ons</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>Enhance your trip with these popular additions.</Text>

          {/* Add-on Items */}
          <TouchableOpacity 
            style={[styles.addonCard, addons.tubeRental && styles.addonCardActive]} 
            onPress={() => toggleAddon('tubeRental')}
            activeOpacity={0.7}
          >
            <View style={styles.addonInfo}>
              <View style={styles.addonTitleRow}>
                <Text style={styles.addonTitle}>Tube Rental</Text>
                <Text style={styles.addonPrice}>+₹{ADDON_PRICES.tubeRental}</Text>
              </View>
              <Text style={styles.addonDesc}>Includes a 2-person towable tube and tow rope for extra fun on the water.</Text>
            </View>
            <View style={[styles.checkbox, addons.tubeRental && styles.checkboxActive]}>
              {addons.tubeRental && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addonCard, addons.captainService && styles.addonCardActive]} 
            onPress={() => toggleAddon('captainService')}
            activeOpacity={0.7}
          >
            <View style={styles.addonInfo}>
              <View style={styles.addonTitleRow}>
                <Text style={styles.addonTitle}>Captain Service</Text>
                <Text style={styles.addonPrice}>+₹{ADDON_PRICES.captainService}</Text>
              </View>
              <Text style={styles.addonDesc}>Sit back and relax. A professional, licensed captain will drive the boat for you.</Text>
            </View>
            <View style={[styles.checkbox, addons.captainService && styles.checkboxActive]}>
              {addons.captainService && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addonCard, addons.fuelPackage && styles.addonCardActive]} 
            onPress={() => toggleAddon('fuelPackage')}
            activeOpacity={0.7}
          >
            <View style={styles.addonInfo}>
              <View style={styles.addonTitleRow}>
                <Text style={styles.addonTitle}>Pre-paid Fuel Package</Text>
                <Text style={styles.addonPrice}>+₹{ADDON_PRICES.fuelPackage}</Text>
              </View>
              <Text style={styles.addonDesc}>Return the boat empty without worrying about refueling fees at the dock.</Text>
            </View>
            <View style={[styles.checkbox, addons.fuelPackage && styles.checkboxActive]}>
              {addons.fuelPackage && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addonCard, addons.cooler && styles.addonCardActive]} 
            onPress={() => toggleAddon('cooler')}
            activeOpacity={0.7}
          >
            <View style={styles.addonInfo}>
              <View style={styles.addonTitleRow}>
                <Text style={styles.addonTitle}>Ice Cooler</Text>
                <Text style={styles.addonPrice}>+₹{ADDON_PRICES.cooler}</Text>
              </View>
              <Text style={styles.addonDesc}>A large 50qt cooler pre-filled with ice to keep your drinks and snacks cold.</Text>
            </View>
            <View style={[styles.checkbox, addons.cooler && styles.checkboxActive]}>
              {addons.cooler && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerPrice}>₹{total.toFixed(2)}</Text>
          <Text style={styles.footerSub}>Current Total</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Marina Info</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20 },
  description: { fontSize: 16, color: '#475569', marginBottom: 24, lineHeight: 24 },
  addonCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  addonCardActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  addonInfo: { flex: 1, marginRight: 16 },
  addonTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addonTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  addonPrice: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  addonDesc: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerInfo: { flex: 1 },
  footerPrice: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  footerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
