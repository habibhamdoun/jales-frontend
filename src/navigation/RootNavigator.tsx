import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

export const RootNavigator: React.FC = () => {
  const [isAuthed, setIsAuthed] = useState(true); // Set to true to skip login

  return (
    <NavigationContainer>
      {isAuthed ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
