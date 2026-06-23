import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';
import SignatureScreen from 'react-native-signature-canvas';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step7_Signature'>;

export default function Step7_SignatureScreen({ navigation }: Props) {
  const { state, updateState } = useBookingContext();
  const signatureRef = useRef<any>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleSignature = (signature: string) => {
    updateState({ signature });
    navigation.navigate('Step8_Payment');
  };

  const handleEmpty = () => {
    Alert.alert('Signature Required', 'Please provide your signature before continuing.');
  };

  const handleClear = () => {
    setHasDrawn(false);
  };

  const handleBegin = () => {
    setHasDrawn(true);
  };

  const handleNext = () => {
    signatureRef.current?.readSignature();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.subtitle}>Step 7 of 8</Text>
          <Text style={styles.title}>Your Signature</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>Please sign inside the box below to complete your liability waiver.</Text>
        
        <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onClear={handleClear}
            onBegin={handleBegin}
            descriptionText="Sign Above"
            clearText="Clear"
            confirmText="Save"
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; width: 100%; height: 100%; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; margin: 0; }
              body,html { width: 100%; height: 100%; margin: 0; padding: 0; }
            `}
          />
          {state.customerDetails.fullName && (
            <Text style={styles.signerName}>{state.customerDetails.fullName}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={() => signatureRef.current?.clearSignature()}>
          <Ionicons name="trash-outline" size={16} color="#64748B" />
          <Text style={styles.clearBtnText}>Clear Signature</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Payment</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  content: { flex: 1, padding: 20 },
  description: { fontSize: 16, color: '#475569', marginBottom: 24, lineHeight: 24 },
  signatureContainer: { height: 300, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden', position: 'relative' },
  signerName: { position: 'absolute', bottom: 16, left: 16, color: '#94A3B8', fontSize: 14, fontStyle: 'italic', pointerEvents: 'none' },
  clearBtn: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  clearBtnText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
