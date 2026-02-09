import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/src/theme/useTheme';
import DailySummaryScreen from '@/src/screens/tabs/summary/DailySummaryScreen';
import WeeklySummaryScreen from '@/src/screens/tabs/summary/WeeklySummaryScreen';
import MonthlySummaryScreen from '@/src/screens/tabs/summary/MonthlySummaryScreen';

export type SummaryTopTabsParamList = {
  Daily: undefined;
  Weekly: undefined;
  Monthly: undefined;
};

const Tab = createMaterialTopTabNavigator<SummaryTopTabsParamList>();

export const SummaryTopTabs: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedText,
        tabBarIndicatorStyle: {
          backgroundColor: theme.primary,
          height: 3,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'none',
        },
      }}
    >
      <Tab.Screen name="Daily" component={DailySummaryScreen} />
      <Tab.Screen name="Weekly" component={WeeklySummaryScreen} />
      <Tab.Screen name="Monthly" component={MonthlySummaryScreen} />
    </Tab.Navigator>
  );
};
