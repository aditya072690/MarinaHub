import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../navigation/types';

type SearchScreenNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'Search'>;

type Props = {
  navigation: SearchScreenNavigationProp;
};

export default function SearchScreen({ navigation }: Props) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [marinas, setMarinas] = useState<any[]>([]);
  const [mapError, setMapError] = useState(false);

  React.useEffect(() => {
    async function fetchMarinas() {
      const { data, error } = await supabase
        .from('marinas')
        .select('id, name, lat, lng')
        .eq('is_active', true);
      
      if (!error && data) {
        setMarinas(data);
      }
    }
    fetchMarinas();
  }, []);

  const filteredMarinas = marinas.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location, boat type..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}>
          <Text style={styles.toggleText}>{viewMode === 'map' ? 'List View' : 'Map View'}</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'map' ? (
        mapError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load map.</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: marinas.length > 0 ? marinas[0].lat : 34.0397,
              longitude: marinas.length > 0 ? marinas[0].lng : -81.152,
              latitudeDelta: 10.0,
              longitudeDelta: 10.0,
            }}
          >
            {filteredMarinas.filter(m => m.lat && m.lng).map(marina => (
              <Marker
                key={marina.id}
                coordinate={{ latitude: marina.lat, longitude: marina.lng }}
                title={marina.name}
                onCalloutPress={() => navigation.navigate('MarinaDetail', { id: marina.id })}
              />
            ))}
          </MapView>
        )
      ) : (
        <FlatList
          data={filteredMarinas}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('MarinaDetail', { id: item.id })}>
              <Text style={styles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginRight: 12,
  },
  toggleBtn: {
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  listItem: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 12,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },
});
