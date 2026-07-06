/**
 * Network Status Hook
 * Monitors online/offline state and provides utilities
 */

import { useState, useEffect, useCallback } from 'react';
import { NetInfo, NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isOffline: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [type, setType] = useState<string>('unknown');

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable);
      setType(state.type);
    });

    // Initial check
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable);
      setType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }, []);

  return {
    isConnected,
    isInternetReachable,
    type,
    isOffline: !isConnected || isInternetReachable === false,
    checkConnection,
  };
}

// Simple offline check without the hook
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}
