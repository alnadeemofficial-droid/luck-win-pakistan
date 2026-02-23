
export enum EntryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AWAITING_TID = 'AWAITING_TID'
}

export interface InvestmentOption {
  id: string;
  investAmount: number;
  winAmount: number;
  membersNeeded: number;
  currentMembers: number;
  qrData?: string; 
  qrImage?: string; 
  color?: string;
  isExpired?: boolean;
  drawCompleted?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  phone: string;
  network: string;
  secondaryPhone?: string;
  secondaryNetwork?: string;
  categoryId: string;
  investAmount?: number; // Added field
  trackingId: string;
  status: EntryStatus;
  timestamp: number;
  secretToken?: string; 
  isWinner?: boolean;
  winAmount?: number;
  winningDate?: number;
}

export interface Announcement {
  id: string;
  text: string;
  textEn: string;
  active: boolean;
}

export type Language = 'ur' | 'en';
