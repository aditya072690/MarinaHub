import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import { View, ActivityIndicator } from 'react-native';

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && session.user ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
