import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Switch, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountScreen() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setEmail(session.user.email || '');
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);
      }
    }
    setLoading(false);
  }

  async function updateProfile() {
    setUpdating(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, email: session.user.email, full_name: fullName, phone, avatar_url: avatarUrl });
        
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('Success', 'Profile updated successfully.');
    }
    setUpdating(false);
  }

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
      // In a real app, upload to Supabase Storage here
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  const openSupport = () => {
    Linking.openURL('mailto:support@marinahub.demo');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : { uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder' }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarText}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Profile Details</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="John Doe" />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />
        </View>
        <TouchableOpacity style={styles.button} onPress={updateProfile} disabled={updating}>
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Profile</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.cardItem}>
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>💳</Text>
            <Text style={styles.cardText}>Visa •••• 4242</Text>
          </View>
          <Text style={styles.cardAction}>Default</Text>
        </View>
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>+ Add New Card</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Booking Updates</Text>
          <Switch value={bookingUpdates} onValueChange={setBookingUpdates} trackColor={{ true: '#0ea5e9' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Promotions & Offers</Text>
          <Switch value={promotions} onValueChange={setPromotions} trackColor={{ true: '#0ea5e9' }} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Help Center</Text>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>Frequently Asked Questions</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpItem} onPress={openSupport}>
          <Text style={styles.helpText}>Contact Support</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={signOut}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E2E8F0',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },
  button: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  cardAction: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  helpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  helpText: {
    fontSize: 16,
    color: '#0F172A',
  },
  chevron: {
    fontSize: 20,
    color: '#94A3B8',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 32,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
