import { create } from 'zustand';

interface SyncStore {
  pendingCount: number;
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'error';
  setPending: (count: number) => void;
  setStatus: (status: 'idle' | 'syncing' | 'error') => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  pendingCount: 0,
  lastSync: null,
  status: 'idle',
  setPending: (count) => set({ pendingCount: count }),
  setStatus: (status) => set({ status }),
}));
