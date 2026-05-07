import React, { createContext, useContext } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

interface AuthContextValue {
  isAuthed: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthContext.Provider');
  }

  return context;
};
