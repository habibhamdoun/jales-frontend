# JALES Frontend - COE 596: Capstone Design Project II

## Project Overview

This repository contains the frontend implementation of the JALES (smart posture monitoring) mobile application developed for COE 596 Capstone Design Project II. The application serves as the primary user interface and processing layer between the JALES wearable shirt and the backend services.

The frontend is built with React Native (Expo) and is responsible for BLE-based device communication, real-time posture data visualization, threshold-based posture analysis, haptic and notification feedback triggers, authentication, and user interaction workflows.

In the context of the overall JALES system, this application functions as the user control and monitoring interface. It receives motion data from the smart shirt, evaluates posture behavior against configured thresholds, and supports user-guided adjustments through a structured and accessible interface.

## Scope of the Frontend System

The implemented frontend covers the following major functions:

- User authentication (register, login, token-based session restore)
- BLE scanning and connection with the JALES shirt device
- Real-time intake and parsing of IMU sensor payloads
- Posture analysis computation and state handling
- Local notification delivery for posture alerts/reminders
- Threshold retrieval and update workflows through backend APIs
- Chat assistant interface for practical posture guidance
- Summary and profile navigation flows for day-to-day use

## Architecture Summary

The frontend follows a modular organization under `src/`, with separation by concern:

- `auth/`: authentication context and user auth state contracts
- `ble/`: BLE provider, device/session state, calibration and sensor streams
- `components/`: reusable UI units and themed primitives
- `hooks/`: shared custom hooks (`useBle`, theming helpers)
- `navigation/`: authentication flow, tabs, stack screens, and summaries
- `screens/`: feature-oriented screens (connect, calibration, chat, settings, summaries)
- `services/`: API, auth calls, token storage, notifications, chat transport, thresholds
- `theme/`: app-level color system and theme provider
- `utils/`: payload parsing, posture math, REBA-related calculations, formatting helpers

This structure supports maintainability and traceability by aligning data flow and UI responsibilities with explicit modules.

## Technology Stack

- React Native `0.81.x`
- Expo SDK `54`
- TypeScript
- React Navigation (native stack, bottom tabs, material top tabs)
- BLE transport via `react-native-ble-plx`
- Local secure token handling (`expo-secure-store` on mobile, localStorage on web)
- Local notifications via `expo-notifications`

## Runtime and Integration Notes

1. Bluetooth behavior:

- BLE features are intended for development builds and native runtime.
- Expo Go does not provide full BLE support for this project workflow.

2. API base URL resolution:

- The app uses `EXPO_PUBLIC_API_BASE_URL` (preferred), with `EXPO_PUBLIC_JALES_API_URL` as fallback.

3. Chat integration fallback order:

- Backend chat endpoint through app base URL (`/chat`)
- Explicit chat URL (`EXPO_PUBLIC_JALES_CHAT_API_URL`)
- Direct OpenAI Responses API using `EXPO_PUBLIC_OPENAI_API_KEY`

4. Token persistence:

- Native platforms: secure store
- Web: localStorage

## Environment Variables

Create an environment configuration compatible with Expo public env keys:

- `EXPO_PUBLIC_API_BASE_URL` (recommended)
- `EXPO_PUBLIC_JALES_API_URL` (legacy alias)
- `EXPO_PUBLIC_JALES_CHAT_API_URL` (optional legacy chat endpoint)
- `EXPO_PUBLIC_OPENAI_API_KEY` (optional direct OpenAI fallback)
- `EXPO_PUBLIC_OPENAI_MODEL` (optional, default: `gpt-4.1-mini`)

## Setup and Execution

### Prerequisites

- Node.js LTS
- npm
- Expo CLI tooling (via `npx expo`)
- Android Studio / Xcode toolchain for native runs (as applicable)

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Run on Web

```bash
npm run web
```

## Operational Flow (High Level)

1. User launches the app and authentication state is restored.
2. User connects to JALES BLE device from the connect workflow.
3. Sensor payloads are streamed and parsed (BNO and MPU channels).
4. Posture angles and analysis logic evaluate user alignment in near real-time.
5. On threshold violations, user feedback is surfaced through app alerts/notifications.
6. User data (including thresholds and profile fields) is synchronized through backend APIs.

## Quality and Design Intent

The frontend design decisions reflect capstone-level engineering constraints for usability, reliability, and extensibility:

- Clear separation of concerns between BLE transport, computation, and interface layers
- Defensive API handling through typed service boundaries
- Session continuity using token storage and bootstrap checks
- User-centered UI organization for quick daily interaction

In alignment with the broader capstone report, this frontend is intended to support iterative validation of wearable posture monitoring behavior under practical user conditions.
