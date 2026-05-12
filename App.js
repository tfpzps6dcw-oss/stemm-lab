import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import { loadTeam } from './src/services/teamStorage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);

  // Check for saved team on launch
  useEffect(() => {
    async function checkForSavedTeam() {
      const savedTeam = await loadTeam();
      setTeam(savedTeam);
      setLoading(false);
    }
    checkForSavedTeam();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: { fontWeight: '500' },
            headerShadowVisible: false,
          }}
        >
          {team ? (
            // Team is set → main app flow
            <>
              <Stack.Screen
                name="Home"
                options={{ headerShown: false }}
              >
                {(props) => (
                  <HomeScreen
                    {...props}
                    team={team}
                    onResetTeam={() => setTeam(null)}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Activity"
                component={ActivityScreen}
                options={{ title: '', headerBackTitle: 'Back' }}
              />
            </>
          ) : (
            // No team → onboarding flow
            <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
              {() => <OnboardingScreen onComplete={setTeam} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});