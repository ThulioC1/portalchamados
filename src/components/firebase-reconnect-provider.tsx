'use client';

import { FirebaseReconnect } from './firebase-reconnect';

export function FirebaseReconnectProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FirebaseReconnect />
      {children}
    </>
  );
}