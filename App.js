import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ActivityScreen from './src/screens/ActivityScreen';

import { onAuthStateChanged } from './src/services/authService';
import { loadTeam } from './src/services/teamStorage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        // User logged in → check if they have a team set up
        const savedTeam = await loadTeam();
        setTeam(savedTeam);
      } else {
        // User logged out → clear team state
        setTeam(null);
      }

      setLoading(false);
    });

    return unsubscribe;
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
          {!user ? (
            // Not logged in → auth flow
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: '', headerBackTitle: 'Back' }}
              />
            </>
          ) : !team ? (
            // Logged in but no team → onboarding
            <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
              {() => <OnboardingScreen onComplete={setTeam} />}
            </Stack.Screen>
          ) : (
            // Logged in with team → main app
            <>
              <Stack.Screen name="Home" options={{ headerShown: false }}>
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
              <Stack.Screen name="Leaderboard" options={{ headerShown: false }}>
                {(props) => <LeaderboardScreen {...props} team={team} />}
              </Stack.Screen>
            </>
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