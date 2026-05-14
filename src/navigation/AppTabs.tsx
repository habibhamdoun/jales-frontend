import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
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
import CalibrationScreen from '@/src/screens/CalibrationScreen';
import SessionDetailScreen from '@/src/screens/stack/SessionDetailScreen';

export type ChatTabParams = {
  /** When set, Chat opens this user message and requests a reply (e.g. daily summary review). */
  dailyCoachPrompt?: string;
};

export type AppTabsParamList = {
  Home: undefined;
  Summary: undefined;
  Chat: ChatTabParams | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Connect: undefined;
  Settings: undefined;
  Calibration: undefined;
  SessionDetail: { sessionId: string; startTime?: string };
};

const Tab = createBottomTabNavigator<AppTabsParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name='ProfileMain' component={ProfileScreen} />
      <ProfileStack.Screen name='Connect' component={ConnectScreen} />
      <ProfileStack.Screen name='Settings' component={SettingsScreen} />
      <ProfileStack.Screen name='Calibration' component={CalibrationScreen} />
      <ProfileStack.Screen
        name='SessionDetail'
        component={SessionDetailScreen}
      />
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
          ...(Platform.OS === 'android' && { marginBottom: 32 }),
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
          popToTopOnBlur: true,
        }}
      />
    </Tab.Navigator>
  );
};
