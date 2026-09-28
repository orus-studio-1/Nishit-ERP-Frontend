// Types, option lists and display helpers for Incentive Tracking. Values mirror the backend enums
// (Nishit-erp-be/src/services/incentives/incentiveScheme.service.ts). Amounts arrive as decimal
// strings from the API and are only formatted here, never recalculated.
import { useAuth } from '@/contexts/AuthContext';

export const TRADE_TYPES = ['DISTRIBUTOR_SALE', 'SUPER_TRADE', 'SPECIAL_TRADE', 'PROJECT_NON_SPA', 'PROJECT_SPA'] as const;
export const MEASUREMENT_TYPES = ['VALUE', 'QUANTITY'] as const;
export const REWARD_TYPES = ['PERCENTAGE', 'FIXED_PER_UNIT'] as const;
export const SLAB_MODES = ['HIGHEST_SLAB_WINS', 'PROGRESSIVE'] as const;
export const AMOUNT_BASES = ['PRE_TAX_BEFORE_DISCOUNT', 'PRE_TAX_AFTER_DISCOUNT'] as const;
export const SCHEME_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'] as const;
export const CONTRIBUTION_STATUSES = ['ACTIVE', 'SUPERSEDED', 'REVERSED', 'ALL'] as const;

export const RETURN_HANDLING_MODES = ['IGNORE_RETURNS', 'DEDUCT_RETURNS'] as const;
export const DATE_BASIS_MODES = ['INVOICE_DATE', 'GRN_DATE'] as const;
export const AUTO_CALCULATE_MODES = ['MANUAL', 'ON_INVOICE_SUBMIT', 'DAILY', 'MONTHLY'] as const;

export type TradeType = (typeof TRADE_TYPES)[number];
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];
export type RewardType = (typeof REWARD_TYPES)[number];
export type SlabMode = (typeof SLAB_MODES)[number];
export type AmountBasisType = (typeof AMOUNT_BASES)[number];
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];
export type ReturnHandlingMode = (typeof RETURN_HANDLING_MODES)[number];
export type DateBasisMode = (typeof DATE_BASIS_MODES)[number];
export type AutoCalculateMode = (typeof AUTO_CALCULATE_MODES)[number];

// Backend status transitions (incentiveScheme.service.ts STATUS_TRANSITIONS); the backend enforces them.
export const STATUS_TRANSITIONS: Record<SchemeStatus, SchemeStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CLOSED', 'CANCELLED'],
  CLOSED: ['ACTIVE'],
  CANCELLED: [],
};

export interface IncentiveSlab {
  id: string;
  schemeId: string;
  thresholdValue: string;
  rewardType: RewardType;
  rewardValue: string;
  altRewardType: RewardType | null;
  altRewardValue: string | null;
  sortOrder: number;
}

export interface IncentiveScheme {
  id: string;
  manufacturerKey: string;
  manufacturerLabel: string;
  name: string;
  code: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  measurementType: MeasurementType;
  eligibleTradeTypes: TradeType[];
  allowAnyTradeType: boolean;
  amountBasis: AmountBasisType;
  allowAnySupplier: boolean;
  eligibleSupplierIds: string[];
  slabMode: SlabMode;
  bookingChannel: string | null;
  status: SchemeStatus;
  
  // Eligibility and calculation configuration (only fields the backend actually persists and uses).
  rewardExcludedProductIds?: string[];
  includedCategoryIds?: string[];
  returnHandling?: ReturnHandlingMode;
  paymentConditionDays?: number | null;
  minInvoiceValue?: string | number | null;
  eligibilityDateBasis?: DateBasisMode;
  autoCalculate: AutoCalculateMode;
  eligibleBranchIds: string[];
  allowAnyBranch: boolean;

  slabs?: IncentiveSlab[];
  _count?: { slabs: number };
}

export interface SlabView {
  id: string;
  thresholdValue: string;
  rewardType: RewardType;
  rewardValue: string;
}

export interface SchemeSummary {
  scheme: Pick<IncentiveScheme, 'id' | 'name' | 'code' | 'manufacturerLabel' | 'status' | 'measurementType' | 'slabMode' | 'allowAnyTradeType' | 'eligibleTradeTypes' | 'amountBasis' | 'allowAnySupplier' | 'eligibleSupplierIds' | 'rewardExcludedProductIds' | 'startDate' | 'endDate'>;
  achievement: { eligibleValue: string; eligibleQuantity: string; activeContributions: number };
  incentive: { primaryAmount: string; alternateAmount: string | null; note: string };
  progress: {
    currentSlab: SlabView | null;
    nextSlab: SlabView | null;
    remainingToNextSlab: string | null;
    progressToNextSlabPercent: string | null;
  };
  freshness: {
    lastRun: { id: string; status: string; startedAt: string; completedAt: string | null } | null;
    lastCompletedAt: string | null;
  };
}

export interface CalculationResult {
  runId: string;
  eligibleValue: string;
  eligibleQuantity: string;
  selectedSlabThreshold: string | null;
  primaryIncentiveAmount: string | null;
  altIncentiveAmount: string | null;
  invoicesConsidered: number;
  invoicesEligible: number;
  invoicesExcluded: Array<{ invoiceNo: string; reason: string }>;
  contributionsCreated: number;
  contributionsSuperseded: number;
}

export interface IncentiveContribution {
  id: string;
  purchaseInvoiceId: string;
  slabId: string | null;
  eligibleValue: string;
  eligibleQuantity: string;
  incentiveAmount: string;
  altIncentiveAmount: string | null;
  calculatedAt: string;
  lifecycleStatus: 'ACTIVE' | 'SUPERSEDED' | 'REVERSED';
  purchaseInvoice: { id: string; invoiceNo: string; date: string; tradeType: TradeType | null } | null;
  lines: Array<{ id: string; quantity: string; eligibleValue: string }>;
}

export interface IncentiveRun {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  reason: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** "DISTRIBUTOR_SALE" -> "Distributor Sale" */
export function humanize(value: string | null | undefined) {
  if (!value) return '—';
  return value.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const num = (value: string | number | null | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function formatQuantity(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num(value));
}

export function formatAmount(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num(value));
}

export function formatPercent(value: string | number | null | undefined) {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(num(value))}%`;
}

/** Threshold / achievement in the scheme's own measurement: money for VALUE, units for QUANTITY. */
export function formatMeasure(value: string | number | null | undefined, type: MeasurementType) {
  return type === 'VALUE' ? formatAmount(value) : `${formatQuantity(value)} units`;
}

export function formatReward(type: RewardType | null, value: string | number | null | undefined) {
  if (!type) return '—';
  return type === 'PERCENTAGE' ? formatPercent(value) : `${formatAmount(value)} / unit`;
}

// Scheme dates are date-only values stored at UTC midnight, so display them in UTC to avoid a one-day shift.
export function formatSchemeDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

/** Client-side permission check mirroring the sidebar logic; the backend remains the authority. */
export function useIncentivePermission() {
  const { user } = useAuth();
  return (resource: 'schemes' | 'calculations' | 'contributions', action: string) => {
    const access = user?.access;
    if (!access || access.isSuperAdmin) return true;
    const key = `incentives:${resource}:${action}`;
    if (access.deniedPermissions.includes(key)) return false;
    return access.permissions.includes(key) || access.permissions.includes(`incentives:${resource}:manage`);
  };
}

// ---- Slab form drafts (shared by the create-scheme form and the slab dialog) ----

export interface SlabDraft {
  thresholdValue: string;
  rewardType: RewardType;
  rewardValue: string;
  altRewardType: RewardType | '';
  altRewardValue: string;
}

export const emptySlabDraft = (): SlabDraft => ({ thresholdValue: '', rewardType: 'PERCENTAGE', rewardValue: '', altRewardType: '', altRewardValue: '' });

export const slabToDraft = (slab: IncentiveSlab): SlabDraft => ({
  thresholdValue: String(num(slab.thresholdValue)),
  rewardType: slab.rewardType,
  rewardValue: String(num(slab.rewardValue)),
  altRewardType: slab.altRewardType ?? '',
  altRewardValue: slab.altRewardValue === null || slab.altRewardValue === undefined ? '' : String(num(slab.altRewardValue)),
});

/** Mirrors backend parseSlab checks; returns an error message or null. */
export function validateSlabDraft(d: SlabDraft, label: string): string | null {
  if (d.thresholdValue.trim() === '' || !Number.isFinite(Number(d.thresholdValue))) return `${label}: threshold must be a number`;
  if (Number(d.thresholdValue) < 0) return `${label}: threshold cannot be negative`;
  if (d.rewardValue.trim() === '' || !Number.isFinite(Number(d.rewardValue))) return `${label}: reward value must be a number`;
  if (Number(d.rewardValue) < 0) return `${label}: reward value cannot be negative`;
  const hasAltType = d.altRewardType !== '';
  const hasAltValue = d.altRewardValue.trim() !== '';
  if (hasAltType !== hasAltValue) return `${label}: alternate reward needs both a type and a value`;
  if (hasAltValue && (!Number.isFinite(Number(d.altRewardValue)) || Number(d.altRewardValue) < 0)) return `${label}: alternate reward must be a non-negative number`;
  return null;
}

export function slabDraftPayload(d: SlabDraft) {
  const hasAlt = d.altRewardType !== '' && d.altRewardValue.trim() !== '';
  return {
    thresholdValue: Number(d.thresholdValue),
    rewardType: d.rewardType,
    rewardValue: Number(d.rewardValue),
    altRewardType: hasAlt ? d.altRewardType : null,
    altRewardValue: hasAlt ? Number(d.altRewardValue) : null,
  };
}
