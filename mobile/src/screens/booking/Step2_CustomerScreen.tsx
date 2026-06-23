import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';
import { z } from 'zod';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step2_Customer'>;

const customerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

export default function Step2_CustomerScreen({ navigation }: Props) {
  const { state, updateState } = useBookingContext();
  
  // Local state for immediate typing before hitting 'Next'
  const [fullName, setFullName] = useState(state.customerDetails.fullName);
  const [email, setEmail] = useState(state.customerDetails.email);
  const [phone, setPhone] = useState(state.customerDetails.phone);
  const [guests, setGuests] = useState(state.customerDetails.guests);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    try {
      // Validate
      customerSchema.parse({ fullName, email, phone });
      setErrors({});
      
      // Update global context
      updateState({
        customerDetails: { fullName, email, phone, guests }
      });
      
      navigation.navigate('Step3_Addons');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((e: z.ZodIssue) => {
          if (e.path[0]) {
            fieldErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(fieldErrors);
        Alert.alert('Validation Error', 'Please check the form for errors.');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Step 2 of 8</Text>
            <Text style={styles.title}>Your Details</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of Guests</Text>
            <View style={styles.counterCard}>
              <View>
                <Text style={styles.counterTitle}>Passengers</Text>
                <Text style={styles.counterSub}>Including yourself</Text>
              </View>
              <View style={styles.counterActions}>
                <TouchableOpacity 
                  style={[styles.counterBtn, guests <= 1 && styles.counterBtnDisabled]} 
                  onPress={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  <Ionicons name="remove" size={20} color={guests <= 1 ? "#94A3B8" : "#0F172A"} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guests}</Text>
                <TouchableOpacity 
                  style={styles.counterBtn} 
                  onPress={() => setGuests(guests + 1)}
                >
                  <Ionicons name="add" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Add-ons</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  counterCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  counterTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  counterSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  counterActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  counterBtnDisabled: { opacity: 0.5 },
  counterValue: { fontSize: 18, fontWeight: '700', color: '#0F172A', minWidth: 20, textAlign: 'center' },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
