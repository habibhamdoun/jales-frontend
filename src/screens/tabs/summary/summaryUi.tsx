import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
/** Lucide icon component (color/size compatible). */
type SummaryLucideIcon = React.ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;
import { useTheme } from '@/src/theme/useTheme';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { ThemedButton } from '@/src/components/themed/ThemedButton';

export const SUMMARY_SCROLL_PADDING: ViewStyle = {
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 28,
};

export function useSummaryCardRim(): ViewStyle {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    }),
    [theme.border],
  );
}

export function SummaryHeroShell({
  title,
  subtitle,
  hint,
}: {
  title: string;
  subtitle: string;
  hint?: string;
}): React.ReactElement {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        styles.heroShell,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View pointerEvents='none' style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.heroBlob,
            { backgroundColor: `${theme.primary}14` },
          ]}
        />
      </View>
      <ThemedText variant='caption' style={[styles.heroKicker, { color: theme.primary }]}>
        JALES
      </ThemedText>
      <ThemedText variant='title' color={theme.text} style={styles.heroTitle}>
        {title}
      </ThemedText>
      <ThemedText variant='subtitle' color={theme.text} style={styles.heroSubtitle}>
        {subtitle}
      </ThemedText>
      {hint ? (
        <ThemedText
          variant='caption'
          color={theme.mutedText}
          style={[styles.heroHint, { opacity: isDark ? 0.95 : 1 }]}
        >
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function SummarySectionHeader({
  Icon,
  kicker,
  title,
}: {
  Icon: SummaryLucideIcon;
  kicker: string;
  title: string;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          { backgroundColor: theme.primarySoft },
        ]}
      >
        <Icon color={theme.primary} size={18} strokeWidth={2.2} />
      </View>
      <View style={styles.sectionText}>
        <ThemedText
          variant='caption'
          style={[styles.sectionKicker, { color: theme.primary }]}
        >
          {kicker}
        </ThemedText>
        <ThemedText variant='label' color={theme.text} style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

export function SummarySignInPlaceholder({
  message,
}: {
  message: string;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flexFill, { backgroundColor: theme.background }]}
    >
      <View style={styles.centered}>
        <ThemedText variant='body' color={theme.mutedText} style={styles.centerText}>
          {message}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

export function SummaryLoadingPlaceholder(): React.ReactElement {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flexFill, { backgroundColor: theme.background }]}
    >
      <View style={styles.centered}>
        <ActivityIndicator size='large' color={theme.primary} />
        <ThemedText variant='caption' color={theme.mutedText} style={styles.loadingCap}>
          Loading summary…
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

export function SummaryErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const rim = useSummaryCardRim();
  return (
    <ThemedCard style={[styles.messageCard, rim]}>
      <ThemedText variant='body' color={theme.danger}>
        {message}
      </ThemedText>
      <ThemedButton
        title='Try again'
        variant='secondary'
        size='sm'
        onPress={onRetry}
        style={styles.retryBtn}
      />
    </ThemedCard>
  );
}

export function SummaryEmptyHintCard({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { theme } = useTheme();
  const rim = useSummaryCardRim();
  return (
    <ThemedCard
      style={[
        styles.messageCard,
        rim,
        { backgroundColor: `${theme.primary}08` },
      ]}
    >
      {children}
    </ThemedCard>
  );
}

type SummaryScrollProps = {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
};

export function SummaryScroll({
  refreshing,
  onRefresh,
  children,
}: SummaryScrollProps): React.ReactElement {
  const { theme } = useTheme();
  return (
    <ScrollView
      style={styles.scrollFlex}
      contentContainerStyle={SUMMARY_SCROLL_PADDING}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {children}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingCap: {
    marginTop: 14,
  },
  heroShell: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -50,
    right: -40,
  },
  heroKicker: {
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    fontWeight: '600',
  },
  heroHint: {
    marginTop: 10,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    flex: 1,
    minWidth: 0,
  },
  sectionKicker: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  messageCard: {
    marginBottom: 16,
    padding: 16,
  },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  spacer: {
    height: 28,
  },
});
