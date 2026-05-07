import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { AuthContext } from '@/src/auth/AuthContext';

export const RootNavigator: React.FC = () => {
  const [isAuthed, setIsAuthed] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        isAuthed,
        signIn: () => setIsAuthed(true),
        signOut: () => setIsAuthed(false),
      }}
    >
      <NavigationContainer>
        {isAuthed ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};
