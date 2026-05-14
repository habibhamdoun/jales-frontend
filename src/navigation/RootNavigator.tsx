import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { AuthContext, AuthUser } from '@/src/auth/AuthContext';
import AuthGateSplash from '@/src/screens/auth/AuthGateSplash';
import {
  clearStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '@/src/services/tokenStorage';
import { MonitoringProvider } from '@/src/monitoring/MonitoringProvider';
import { deleteUserCalibration } from '@/src/services/userCalibration';
import { clearCalibrationSnapshot } from '@/src/services/calibrationSnapshotStorage';

export const RootNavigator: React.FC = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const isAuthed = Boolean(token);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [stored, storedUser] = await Promise.all([
          getStoredToken(),
          getStoredUser(),
        ]);
        if (!alive) return;

        if (!stored) {
          setToken(null);
          setUser(null);
          return;
        }

        // Backend has no /auth/validate endpoint. Trust stored credentials;
        // any subsequent authed request will surface a 401 if the token is invalid.
        setToken(stored);
        setUser(storedUser);
      } catch {
        await clearStoredToken();
        if (!alive) return;
        setToken(null);
        setUser(null);
      } finally {
        if (alive) setIsBootstrapping(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      isAuthed,
      token,
      user,
      signIn: (nextToken: string, nextUser: AuthUser) => {
        setToken(nextToken);
        setUser(nextUser);
        setStoredToken(nextToken);
        setStoredUser(nextUser);
      },
      signOut: () => {
        const t = token;
        void (async () => {
          if (t) {
            try {
              await deleteUserCalibration(t);
            } catch {
              /* offline / expired token — still sign out locally */
            }
          }
          try {
            await clearCalibrationSnapshot();
          } catch {
            /* ignore */
          }
          try {
            await clearStoredToken();
          } catch {
            /* ignore */
          }
          setToken(null);
          setUser(null);
        })();
      },
    }),
    [isAuthed, token, user],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      <NavigationContainer>
        {isBootstrapping ? (
          <AuthGateSplash />
        ) : isAuthed ? (
          <MonitoringProvider>
            <AppTabs />
          </MonitoringProvider>
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};
