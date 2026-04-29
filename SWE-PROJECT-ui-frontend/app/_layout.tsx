import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppDataProvider } from './data-context';
import { AuthProvider, useAuth } from './auth-context';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        initialRouteName={isAuthenticated ? '(tabs)' : 'login'}
        screenOptions={{ headerShown: false }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="login" options={{ headerShown: true, title: 'Log In' }} />
            <Stack.Screen
              name="register"
              options={{ headerShown: true, title: 'Create Account' }}
            />
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: true, title: 'Reset password', presentation: 'modal' }}
            />
            <Stack.Screen
              name="reset-password"
              options={{ headerShown: true, title: 'New password', presentation: 'modal' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-service"
              options={{
                headerShown: true,
                title: 'Log Maintenance Record',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="add-vehicle"
              options={{
                headerShown: true,
                title: 'Add Vehicle',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="edit-vehicle"
              options={{
                headerShown: true,
                title: 'Edit Vehicle',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="edit-service"
              options={{
                headerShown: true,
                title: 'Edit Record',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: true, title: 'Reset password', presentation: 'modal' }}
            />
            <Stack.Screen
              name="reset-password"
              options={{ headerShown: true, title: 'New password', presentation: 'modal' }}
            />
            <Stack.Screen
              name="edit-profile"
              options={{ headerShown: true, title: 'Edit Profile', presentation: 'modal' }}
            />
            <Stack.Screen
              name="notification-settings"
              options={{
                headerShown: true,
                title: 'Notification Settings',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="signed-out"
              options={{ headerShown: true, title: 'Signed Out', presentation: 'modal' }}
            />
            <Stack.Screen
              name="modal"
              options={{ headerShown: true, presentation: 'modal', title: 'Modal' }}
            />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <RootNavigator />
      </AppDataProvider>
    </AuthProvider>
  );
}