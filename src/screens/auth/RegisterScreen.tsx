import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/src/navigation/AuthStack';
import { Screen } from '@/src/components/themed/Screen';
import { ThemedText } from '@/src/components/themed/ThemedText';
import { ThemedInput } from '@/src/components/themed/ThemedInput';
import { ThemedButton } from '@/src/components/themed/ThemedButton';
import { ThemedCard } from '@/src/components/themed/ThemedCard';
import { useTheme } from '@/src/theme/useTheme';
import { ChevronDown, Check } from 'lucide-react-native';
import { registerUser } from '@/src/services/auth';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

type SelectOption = {
  label: string;
  value: string;
};

type DropdownMenu = {
  id: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  frame: {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  };
};

const DropdownContext = React.createContext<{
  activeDropdown: DropdownMenu | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<DropdownMenu | null>>;
} | null>(null);

const genderOptions: SelectOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const bodyTypeOptions: SelectOption[] = [
  { label: 'Slim', value: 'slim' },
  { label: 'Average', value: 'average' },
  { label: 'Muscular', value: 'muscular' },
  { label: 'Overweight', value: 'overweight' },
];

const workTypeOptions: SelectOption[] = [
  { label: 'Office', value: 'office' },
  { label: 'Labor', value: 'labor' },
  { label: 'Student', value: 'student' },
  { label: 'Driver', value: 'driver' },
  { label: 'Programmer', value: 'programmer' },
];

const mattressOptions: SelectOption[] = [
  { label: 'Soft', value: 'soft' },
  { label: 'Medium', value: 'medium' },
  { label: 'Firm', value: 'firm' },
  { label: 'Orthopedic', value: 'orthopedic' },
  { label: 'Not sure', value: 'not_sure' },
];

const sensitivityOptions: SelectOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Default', value: 'default' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const reminderFrequencyOptions: SelectOption[] = [
  { label: 'Every 15 minutes', value: '15_min' },
  { label: 'Every 30 minutes', value: '30_min' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Every 2 hours', value: '2_hours' },
  { label: 'Off', value: 'off' },
];

const themeOptions: SelectOption[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Arabic', value: 'ar' },
  { label: 'French', value: 'fr' },
];

const goalOptions: SelectOption[] = [
  { label: 'Pain reduction', value: 'pain_reduction' },
  { label: 'Posture correction', value: 'posture_correction' },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Ergonomics', value: 'ergonomics' },
  { label: 'Rehabilitation', value: 'rehabilitation' },
];

const exerciseOptions: SelectOption[] = [
  { label: 'Never', value: 'never' },
  { label: '1-2 times/week', value: '1_2_week' },
  { label: '3-4 times/week', value: '3_4_week' },
  { label: '5+ times/week', value: '5_plus_week' },
];

const healthProblemOptions: SelectOption[] = [
  { label: 'Scoliosis', value: 'scoliosis' },
  { label: 'Kyphosis', value: 'kyphosis' },
  { label: 'Lordosis', value: 'lordosis' },
  { label: 'Forward head posture', value: 'forward_head_posture' },
  { label: 'Rounded shoulders', value: 'rounded_shoulders' },
  { label: 'Chronic neck pain', value: 'chronic_neck_pain' },
  { label: 'Chronic back pain', value: 'chronic_back_pain' },
  { label: 'Shoulder pain', value: 'shoulder_pain' },
  { label: 'Previous spine injuries', value: 'previous_spine_injuries' },
  { label: 'Herniated disc history', value: 'herniated_disc_history' },
  { label: 'Physical therapy history', value: 'physical_therapy_history' },
];

const optionalLabel = (label: string) => `${label} (optional)`;

const toNumberOrNull = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const SelectField: React.FC<{
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const { theme } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const dropdownContext = React.useContext(DropdownContext);
  const selectButtonRef = useRef<View>(null);
  const open = dropdownContext?.activeDropdown?.id === label;
  const selected = options.find((option) => option.value === value);

  const toggleOpen = () => {
    if (!dropdownContext) {
      return;
    }

    if (open) {
      dropdownContext.setActiveDropdown(null);
      return;
    }

    selectButtonRef.current?.measureInWindow((left, top, width, height) => {
      const desiredHeight = Math.min(options.length * 42, 280);
      const spaceBelow = windowHeight - (top + height) - 12;
      const shouldOpenUp = spaceBelow < Math.min(desiredHeight, 180) && top > spaceBelow;
      const panelTop = shouldOpenUp
        ? Math.max(12, top - desiredHeight - 6)
        : top + height + 6;
      const maxHeight = shouldOpenUp
        ? Math.min(desiredHeight, top - 18)
        : Math.min(desiredHeight, windowHeight - panelTop - 12);

      dropdownContext.setActiveDropdown({
        id: label,
        options,
        value,
        onChange,
        frame: {
          left,
          top: panelTop,
          width,
          maxHeight: Math.max(120, maxHeight),
        },
      });
    });
  };

  return (
    <View style={[styles.field, open && styles.fieldOpen]}>
      <ThemedText variant='label' style={styles.inputLabel}>
        {label}
      </ThemedText>
      <TouchableOpacity
        ref={selectButtonRef}
        activeOpacity={0.85}
        onPress={toggleOpen}
        style={[
          styles.selectButton,
          { borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <ThemedText variant='body'>{selected?.label || 'Select'}</ThemedText>
        <ChevronDown color={theme.mutedText} size={18} />
      </TouchableOpacity>
    </View>
  );
};

const MultiSelectField: React.FC<{
  label: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
}> = ({ label, values, options, onChange }) => {
  const { theme } = useTheme();

  const toggleValue = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  };

  return (
    <View style={styles.field}>
      <ThemedText variant='label' style={styles.inputLabel}>
        {label}
      </ThemedText>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              onPress={() => toggleValue(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primarySoft : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                variant='caption'
                color={selected ? theme.primary : theme.text}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <ThemedText variant='subtitle' style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedCard style={styles.sectionCard}>{children}</ThemedCard>
    </View>
  );
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [activeDropdown, setActiveDropdown] = useState<DropdownMenu | null>(null);

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const [shoulderWidthCm, setShoulderWidthCm] = useState('');
  const [neckLengthCm, setNeckLengthCm] = useState('');
  const [torsoLengthCm, setTorsoLengthCm] = useState('');
  const [armLengthCm, setArmLengthCm] = useState('');
  const [bodyType, setBodyType] = useState('average');

  const [healthProblems, setHealthProblems] = useState<string[]>([]);

  const [dailySittingHours, setDailySittingHours] = useState('');
  const [dailyStandingHours, setDailyStandingHours] = useState('');
  const [gamingDurationHours, setGamingDurationHours] = useState('');
  const [studyDurationHours, setStudyDurationHours] = useState('');
  const [workDurationHours, setWorkDurationHours] = useState('');
  const [exerciseFrequency, setExerciseFrequency] = useState('1_2_week');
  const [workType, setWorkType] = useState('student');
  const [sleepDurationHours, setSleepDurationHours] = useState('');
  const [mattressType, setMattressType] = useState('');
  const [phoneUsageHours, setPhoneUsageHours] = useState('');
  const [tabletLaptopUsageHours, setTabletLaptopUsageHours] = useState('');

  const [neutralPostureCalibration, setNeutralPostureCalibration] =
    useState('');
  const [maximumNeckFlexion, setMaximumNeckFlexion] = useState('');
  const [comfortableSittingAngle, setComfortableSittingAngle] = useState('');
  const [comfortableStandingAngle, setComfortableStandingAngle] = useState('');
  const [personalizedSafeThresholds, setPersonalizedSafeThresholds] =
    useState('');
  const [walkingPostureBaseline, setWalkingPostureBaseline] = useState('');
  const [shoulderAlignmentBaseline, setShoulderAlignmentBaseline] =
    useState('');

  const [notificationSensitivity, setNotificationSensitivity] =
    useState('default');
  const [vibrationIntensityPreference, setVibrationIntensityPreference] =
    useState('medium');
  const [reminderFrequency, setReminderFrequency] = useState('30_min');
  const [themeMode, setThemeMode] = useState('system');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [goalType, setGoalType] = useState('posture_correction');

  const [loading, setLoading] = useState(false);

  const bmi = useMemo(() => {
    const height = toNumberOrNull(heightCm);
    const weight = toNumberOrNull(weightKg);
    if (!height || !weight || height <= 0) return null;

    return weight / (height / 100) ** 2;
  }, [heightCm, weightKg]);

  const handleRegister = async () => {
    setLoading(true);

    const payload = {
      account: {
        email,
        password,
      },
      profile: {
        fullName,
        nickname: nickname || null,
        age: toNumberOrNull(age),
        gender,
        heightCm: toNumberOrNull(heightCm),
        weightKg: toNumberOrNull(weightKg),
        bmi: bmi ? Number(bmi.toFixed(1)) : null,
      },
      body: {
        shoulderWidthCm: toNumberOrNull(shoulderWidthCm),
        neckLengthCm: toNumberOrNull(neckLengthCm),
        torsoLengthCm: toNumberOrNull(torsoLengthCm),
        armLengthCm: toNumberOrNull(armLengthCm),
        bodyType,
      },
      health: {
        existingPostureProblems: healthProblems,
      },
      lifestyle: {
        dailySittingHours: toNumberOrNull(dailySittingHours),
        dailyStandingHours: toNumberOrNull(dailyStandingHours),
        gamingDurationHours: toNumberOrNull(gamingDurationHours),
        studyDurationHours: toNumberOrNull(studyDurationHours),
        workDurationHours: toNumberOrNull(workDurationHours),
        exerciseFrequency,
        workType,
        sleepDurationHours: toNumberOrNull(sleepDurationHours),
        mattressType: mattressType || null,
        phoneUsageHours: toNumberOrNull(phoneUsageHours),
        tabletLaptopUsageHours: toNumberOrNull(tabletLaptopUsageHours),
      },
      calibration: {
        neutralPostureCalibration: neutralPostureCalibration || null,
        maximumNeckFlexion: toNumberOrNull(maximumNeckFlexion),
        comfortableSittingAngle: toNumberOrNull(comfortableSittingAngle),
        comfortableStandingAngle: toNumberOrNull(comfortableStandingAngle),
        personalizedSafeThresholds: personalizedSafeThresholds || null,
        walkingPostureBaseline: walkingPostureBaseline || null,
        shoulderAlignmentBaseline: shoulderAlignmentBaseline || null,
      },
      personalization: {
        notificationSensitivity,
        vibrationIntensityPreference,
        reminderFrequency,
        themeMode,
        preferredLanguage,
        goalType,
      },
    };

    try {
      await registerUser(payload);
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownContext.Provider value={{ activeDropdown, setActiveDropdown }}>
      <View style={styles.screenRoot}>
        <Screen scrollable>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.header}>
              <ThemedText variant='title' style={styles.title}>
                Create Account
              </ThemedText>
              <ThemedText variant='body' color={theme.mutedText}>
                Build your JALES posture profile
              </ThemedText>
            </View>

            <View style={styles.form}>
          <Section title='Basic Profile'>
            <ThemedInput
              label='Full name'
              placeholder='Enter your full name'
              value={fullName}
              onChangeText={setFullName}
            />
            <ThemedInput
              label={optionalLabel('Nickname')}
              placeholder='What should JALES call you?'
              value={nickname}
              onChangeText={setNickname}
            />
            <ThemedInput
              label='Email'
              placeholder='Enter your email'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
            />
            <ThemedInput
              label='Password'
              placeholder='Enter your password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <ThemedInput
              label='Confirm password'
              placeholder='Re-enter your password'
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <View style={styles.row}>
              <ThemedInput
                label='Age'
                placeholder='Years'
                value={age}
                onChangeText={setAge}
                keyboardType='number-pad'
                style={styles.rowInput}
              />
              <SelectField
                label='Gender'
                value={gender}
                options={genderOptions}
                onChange={setGender}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                label='Height (cm)'
                placeholder='175'
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label='Weight (kg)'
                placeholder='70'
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <View style={[styles.bmiBox, { backgroundColor: theme.primarySoft }]}>
              <ThemedText variant='label' color={theme.primary}>
                BMI
              </ThemedText>
              <ThemedText variant='subtitle' color={theme.primary}>
                {bmi ? bmi.toFixed(1) : '--'}
              </ThemedText>
            </View>
          </Section>

          <Section title='Body & Physical Information'>
            <View style={styles.row}>
              <ThemedInput
                label={optionalLabel('Shoulder width (cm)')}
                placeholder='Optional'
                value={shoulderWidthCm}
                onChangeText={setShoulderWidthCm}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label={optionalLabel('Neck length (cm)')}
                placeholder='Optional'
                value={neckLengthCm}
                onChangeText={setNeckLengthCm}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                label={optionalLabel('Torso length (cm)')}
                placeholder='Optional'
                value={torsoLengthCm}
                onChangeText={setTorsoLengthCm}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label={optionalLabel('Arm length (cm)')}
                placeholder='Optional'
                value={armLengthCm}
                onChangeText={setArmLengthCm}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <SelectField
              label='General body type'
              value={bodyType}
              options={bodyTypeOptions}
              onChange={setBodyType}
            />
          </Section>

          <Section title='Health & Ergonomic Information'>
            <MultiSelectField
              label='Existing posture problems'
              values={healthProblems}
              options={healthProblemOptions}
              onChange={setHealthProblems}
            />
          </Section>

          <Section title='Lifestyle & Daily Habits'>
            <View style={styles.row}>
              <ThemedInput
                label='Daily sitting hours'
                placeholder='8'
                value={dailySittingHours}
                onChangeText={setDailySittingHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label='Daily standing hours'
                placeholder='2'
                value={dailyStandingHours}
                onChangeText={setDailyStandingHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                label={optionalLabel('Gaming duration')}
                placeholder='Hours'
                value={gamingDurationHours}
                onChangeText={setGamingDurationHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label='Study duration'
                placeholder='Hours'
                value={studyDurationHours}
                onChangeText={setStudyDurationHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <ThemedInput
              label='Work duration'
              placeholder='Hours per day'
              value={workDurationHours}
              onChangeText={setWorkDurationHours}
              keyboardType='decimal-pad'
            />
            <View style={styles.row}>
              <SelectField
                label='Exercise frequency'
                value={exerciseFrequency}
                options={exerciseOptions}
                onChange={setExerciseFrequency}
              />
              <SelectField
                label='Type of work'
                value={workType}
                options={workTypeOptions}
                onChange={setWorkType}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                label='Sleep duration'
                placeholder='Hours'
                value={sleepDurationHours}
                onChangeText={setSleepDurationHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <SelectField
                label={optionalLabel('Mattress type')}
                value={mattressType}
                options={mattressOptions}
                onChange={setMattressType}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                label='Phone usage duration'
                placeholder='Hours'
                value={phoneUsageHours}
                onChangeText={setPhoneUsageHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label='Tablet/laptop usage duration'
                placeholder='Hours'
                value={tabletLaptopUsageHours}
                onChangeText={setTabletLaptopUsageHours}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
          </Section>

          <Section title='Calibration Data'>
            <ThemedInput
              label='Neutral posture calibration'
              placeholder='Will be captured from sensors later'
              value={neutralPostureCalibration}
              onChangeText={setNeutralPostureCalibration}
            />
            <View style={styles.row}>
              <ThemedInput
                label='Maximum neck flexion'
                placeholder='Degrees'
                value={maximumNeckFlexion}
                onChangeText={setMaximumNeckFlexion}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
              <ThemedInput
                label='Comfortable sitting angle'
                placeholder='Degrees'
                value={comfortableSittingAngle}
                onChangeText={setComfortableSittingAngle}
                keyboardType='decimal-pad'
                style={styles.rowInput}
              />
            </View>
            <ThemedInput
              label='Comfortable standing angle'
              placeholder='Degrees'
              value={comfortableStandingAngle}
              onChangeText={setComfortableStandingAngle}
              keyboardType='decimal-pad'
            />
            <ThemedInput
              label='Personalized safe thresholds'
              placeholder='Describe or enter threshold notes'
              value={personalizedSafeThresholds}
              onChangeText={setPersonalizedSafeThresholds}
              multiline
            />
            <ThemedInput
              label='Walking posture baseline'
              placeholder='Will be captured from sensors later'
              value={walkingPostureBaseline}
              onChangeText={setWalkingPostureBaseline}
            />
            <ThemedInput
              label='Shoulder alignment baseline'
              placeholder='Will be captured from sensors later'
              value={shoulderAlignmentBaseline}
              onChangeText={setShoulderAlignmentBaseline}
            />
          </Section>

          <Section title='App Personalization'>
            <View style={styles.row}>
              <SelectField
                label='Notification sensitivity'
                value={notificationSensitivity}
                options={sensitivityOptions}
                onChange={setNotificationSensitivity}
              />
              <SelectField
                label='Vibration intensity'
                value={vibrationIntensityPreference}
                options={sensitivityOptions}
                onChange={setVibrationIntensityPreference}
              />
            </View>
            <SelectField
              label='Reminder frequency'
              value={reminderFrequency}
              options={reminderFrequencyOptions}
              onChange={setReminderFrequency}
            />
            <View style={styles.row}>
              <SelectField
                label='Dark/light mode'
                value={themeMode}
                options={themeOptions}
                onChange={setThemeMode}
              />
              <SelectField
                label='Preferred language'
                value={preferredLanguage}
                options={languageOptions}
                onChange={setPreferredLanguage}
              />
            </View>
            <SelectField
              label='Goal type'
              value={goalType}
              options={goalOptions}
              onChange={setGoalType}
            />
          </Section>

          <ThemedButton
            title='Create Account'
            variant='primary'
            size='lg'
            onPress={handleRegister}
            loading={loading}
            disabled={password.length > 0 && password !== confirmPassword}
            style={styles.button}
          />

          {password.length > 0 && password !== confirmPassword && (
            <ThemedText
              variant='caption'
              color={theme.danger}
              style={styles.passwordWarning}
            >
              Passwords do not match.
            </ThemedText>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkContainer}
          >
            <ThemedText variant='body' color={theme.mutedText}>
              Already have an account?{' '}
            </ThemedText>
            <ThemedText variant='body' color={theme.primary}>
              Sign In
            </ThemedText>
          </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Screen>

        {activeDropdown && (
          <View pointerEvents='box-none' style={styles.dropdownOverlay}>
            <ScrollView
              keyboardShouldPersistTaps='handled'
              style={[
                styles.floatingOptionsPanel,
                {
                  left: activeDropdown.frame.left,
                  top: activeDropdown.frame.top,
                  width: activeDropdown.frame.width,
                  maxHeight: activeDropdown.frame.maxHeight,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              {activeDropdown.options.map((option) => {
                const isSelected = option.value === activeDropdown.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      activeDropdown.onChange(option.value);
                      setActiveDropdown(null);
                    }}
                    style={styles.optionRow}
                  >
                    <ThemedText
                      variant='body'
                      color={isSelected ? theme.primary : theme.text}
                    >
                      {option.label}
                    </ThemedText>
                    {isSelected && <Check color={theme.primary} size={16} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </DropdownContext.Provider>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  form: {
    width: '100%',
    paddingBottom: 32,
    overflow: 'visible',
    zIndex: 1,
  },
  section: {
    marginBottom: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  sectionCard: {
    paddingBottom: 4,
    overflow: 'visible',
    zIndex: 1,
    elevation: 1,
  },
  inputLabel: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  rowInput: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
  },
  field: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  fieldOpen: {
    zIndex: 9999,
    elevation: 9999,
  },
  selectButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionsPanel: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
    zIndex: 99999,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
  floatingOptionsPanel: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 999999,
    elevation: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  optionRow: {
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bmiBox: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  passwordWarning: {
    marginTop: 8,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default RegisterScreen;
