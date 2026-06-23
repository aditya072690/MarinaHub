import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step6_Waiver'>;

export default function Step6_WaiverScreen({ navigation }: Props) {
  const { state, updateState } = useBookingContext();
  const [accepted, setAccepted] = useState(state.waiverAccepted);

  const handleNext = () => {
    if (!accepted) {
      Alert.alert('Agreement Required', 'You must read and accept the liability waiver before continuing.');
      return;
    }
    updateState({ waiverAccepted: true });
    navigation.navigate('Step7_Signature');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.subtitle}>Step 6 of 8</Text>
          <Text style={styles.title}>Liability Waiver</Text>
        </View>
      </View>

      <ScrollView style={styles.waiverContainer} contentContainerStyle={styles.waiverContent}>
        <Text style={styles.waiverTitle}>RELEASE OF LIABILITY AND ASSUMPTION OF RISK AGREEMENT</Text>
        
        <Text style={styles.waiverText}>
          IN CONSIDERATION of being permitted to participate in boating activities and the rental of watercraft equipment, I, for myself, my personal representatives, assigns, heirs, and next of kin:
        </Text>
        
        <Text style={styles.waiverText}>
          1. ACKNOWLEDGE, agree, and represent that I understand the nature of boating activities and that I am qualified, in good health, and in proper physical condition to participate in such activity. I further agree and warrant that if at any time I believe conditions to be unsafe, I will immediately discontinue further participation in the activity.
        </Text>
        
        <Text style={styles.waiverText}>
          2. FULLY UNDERSTAND that: (a) BOATING ACTIVITIES INVOLVE RISKS AND DANGERS OF SERIOUS BODILY INJURY, INCLUDING PERMANENT DISABILITY, PARALYSIS, AND DEATH ("Risks"); (b) these Risks and dangers may be caused by my own actions or inactions, the actions or inactions of others participating in the activity, the condition in which the activity takes place, or THE NEGLIGENCE OF THE "RELEASEES" NAMED BELOW; (c) there may be OTHER RISKS AND SOCIAL AND ECONOMIC LOSSES either not known to me or not readily foreseeable at this time; and I FULLY ACCEPT AND ASSUME ALL SUCH RISKS AND ALL RESPONSIBILITY FOR LOSSES, COSTS, AND DAMAGES I incur as a result of my participation or that of the minor in the activity.
        </Text>

        <Text style={styles.waiverText}>
          3. HEREBY RELEASE, DISCHARGE, AND COVENANT NOT TO SUE Marina Hub, its administrators, directors, agents, officers, members, volunteers, and employees, other participants, any sponsors, advertisers, and, if applicable, owners and lessors of premises on which the activity takes place, (each considered one of the "RELEASEES" herein) FROM ALL LIABILITY, CLAIMS, DEMANDS, LOSSES, OR DAMAGES ON MY ACCOUNT CAUSED OR ALLEGED TO BE CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF THE RELEASEES OR OTHERWISE, INCLUDING NEGLIGENT RESCUE OPERATIONS.
        </Text>

        <Text style={styles.waiverText}>
          4. AGREE to wear a USCG-approved personal flotation device (life jacket) at all times while the vessel is underway.
        </Text>

        <Text style={styles.waiverText}>
          I HAVE READ THIS AGREEMENT, FULLY UNDERSTAND ITS TERMS, UNDERSTAND THAT I HAVE GIVEN UP SUBSTANTIAL RIGHTS BY SIGNING IT AND HAVE SIGNED IT FREELY AND WITHOUT ANY INDUCEMENT OR ASSURANCE OF ANY NATURE AND INTEND IT TO BE A COMPLETE AND UNCONDITIONAL RELEASE OF ALL LIABILITY TO THE GREATEST EXTENT ALLOWED BY LAW.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>I have read and agree to the Terms & Conditions and Liability Waiver.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryButton, !accepted && styles.primaryButtonDisabled]} 
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>Next: Digital Signature</Text>
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
  waiverContainer: { flex: 1, backgroundColor: '#FFFFFF', margin: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  waiverContent: { padding: 20 },
  waiverTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  waiverText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16 },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
