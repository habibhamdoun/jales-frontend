import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/src/theme/useTheme';
import {
  Home,
  BarChart3,
  MessageCircle,
  User,
  Settings as SettingsIcon,
} from 'lucide-react-native';

import HomeScreen from '@/src/screens/tabs/HomeScreen';
import ChatScreen from '@/src/screens/tabs/ChatScreen';
import ProfileScreen from '@/src/screens/tabs/ProfileScreen';
import { SummaryTopTabs } from './SummaryTopTabs';
import ConnectScreen from '@/src/screens/stack/ConnectScreen';
import SettingsScreen from '@/src/screens/stack/SettingsScreen';

export type AppTabsParamList = {
  Home: undefined;
  Summary: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Connect: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name='ProfileMain' component={ProfileScreen} />
      <ProfileStack.Screen name='Connect' component={ConnectScreen} />
      <ProfileStack.Screen name='Settings' component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
};

export const AppTabs: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingTop: 8,
          paddingBottom: 16,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name='Summary'
        component={SummaryTopTabs}
        options={{
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name='Chat'
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name='Profile'
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
