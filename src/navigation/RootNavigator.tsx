import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { AuthContext, AuthUser } from '@/src/auth/AuthContext';
import AuthGateSplash from '@/src/screens/auth/AuthGateSplash';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/src/services/tokenStorage';
import { validateToken } from '@/src/services/auth';

export const RootNavigator: React.FC = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const isAuthed = Boolean(token);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const stored = await getStoredToken();
        if (!alive) return;

        if (!stored) {
          setToken(null);
          setUser(null);
          return;
        }

        const validation = await validateToken(stored);
        if (!alive) return;

        setToken(stored);
        const nextUser: AuthUser = {
          id: validation.user?.userId || '',
          name: '',
          email: validation.user?.email || '',
        };
        setUser(nextUser);
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
      },
      signOut: () => {
        setToken(null);
        setUser(null);
        clearStoredToken();
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
          <AppTabs />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};
