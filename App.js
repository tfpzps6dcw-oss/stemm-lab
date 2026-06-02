// STEM-152: Dark mode support via ThemeContext. Follows device colour scheme.
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestPermission } from './src/services/notificationService';
import { startSyncQueue, stopSyncQueue } from './src/services/syncQueue';

import LeaderboardScreen from './src/screens/LeaderboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import MapScreen from './src/screens/MapScreen';

import { onAuthStateChanged } from './src/services/authService';
import { loadTeam } from './src/services/teamStorage';
import { lightTheme, darkTheme } from './src/theme';
import { ThemeContext } from './src/theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);

  // STEM-152: Follow the device light/dark preference automatically.
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  
  
  
  useEffect(() => {
    requestPermission().catch(() => {});
    startSyncQueue();

    const unsubscribe = onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const savedTeam = await loadTeam();
        setTeam(savedTeam);
      } else {
        setTeam(null);
      }
      setLoading(false);
    });

    return () => {
      stopSyncQueue();
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    // STEM-152: Wrap entire app in ThemeContext so all screens get the theme.
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <StatusBar barStyle={theme.statusBar} />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: theme.headerBackground },
              headerTitleStyle: { fontWeight: '500', color: theme.text },
              headerTintColor: theme.primary,
              headerShadowVisible: false,
            }}
          >
            {!user ? (
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
              <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
                {() => <OnboardingScreen onComplete={setTeam} />}
              </Stack.Screen>
            ) : (
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
                <Stack.Screen
                  name="Map"
                  component={MapScreen}
                  options={{ title: 'Activity Map', headerBackTitle: 'Back' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});