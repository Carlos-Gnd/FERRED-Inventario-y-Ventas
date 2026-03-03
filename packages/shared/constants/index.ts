export const ROLES = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  BODEGA: 'BODEGA',
} as const;

export const BRANCHES = {
  CENTRAL: 1,
  NORTE: 2,
} as const;

export const SYNC_STATUS = {
  PENDING: 'PENDING',
  SYNCED: 'SYNCED',
  ERROR: 'ERROR',
} as const;
