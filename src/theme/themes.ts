import * as colors from './tailwindColors';

export interface ThemeTokens {
  background: string;
  surface: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  chip: string;
  tabActive: string;
  tabInactive: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export const lightTheme: ThemeTokens = {
  background: colors.gray[50],
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: colors.gray[900],
  mutedText: colors.gray[500],
  border: colors.gray[200],
  primary: colors.teal[500],
  primarySoft: colors.teal[100],
  success: colors.green[500],
  warning: colors.amber[500],
  danger: colors.red[500],
  chip: colors.teal[50],
  tabActive: colors.teal[500],
  tabInactive: colors.gray[400],
  chart1: colors.teal[500],
  chart2: colors.teal[400],
  chart3: colors.teal[300],
  chart4: colors.cyan[400],
  chart5: colors.emerald[400],
};

export const darkTheme: ThemeTokens = {
  background: colors.gray[900],
  surface: colors.gray[800],
  card: colors.gray[800],
  text: colors.gray[50],
  mutedText: colors.gray[400],
  border: colors.gray[700],
  primary: colors.teal[400],
  primarySoft: colors.teal[900],
  success: colors.green[400],
  warning: colors.amber[400],
  danger: colors.red[400],
  chip: colors.teal[900],
  tabActive: colors.teal[400],
  tabInactive: colors.gray[500],
  chart1: colors.teal[400],
  chart2: colors.teal[500],
  chart3: colors.teal[600],
  chart4: colors.cyan[500],
  chart5: colors.emerald[500],
};
