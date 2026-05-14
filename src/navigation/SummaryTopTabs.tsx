import React from 'react';
import { StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TAB_BAR_EXTRA_TOP = 8;

export const SummaryTopTabs: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarTopPad = insets.top + TAB_BAR_EXTRA_TOP;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedText,
        tabBarPressColor: `${theme.primary}18`,
        tabBarIndicatorStyle: {
          backgroundColor: theme.primary,
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: tabBarTopPad,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          textTransform: 'none',
        },
        tabBarItemStyle: {
          paddingVertical: 10,
          minHeight: 44,
        },
      }}
    >
      <Tab.Screen name="Daily" component={DailySummaryScreen} />
      <Tab.Screen name="Weekly" component={WeeklySummaryScreen} />
      <Tab.Screen name="Monthly" component={MonthlySummaryScreen} />
    </Tab.Navigator>
  );
};
