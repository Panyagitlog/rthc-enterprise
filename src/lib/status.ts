/**
 * Single source of truth for status → color/label/icon-name mapping.
 * Phase 4 §12: this logic must never be re-implemented per component —
 * it's the #1 source of visual drift in enterprise dashboards.
 *
 * Usage: const { tone, label } = useStatusTone('shortage')
 */

export type StatusKind =
  | 'shortage'
  | 'complete'
  | 'surplus'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'present'
  | 'absent'
  | 'active'
  | 'inactive'
  | 'info'

export type Tone = 'success' | 'danger' | 'warning' | 'neutral' | 'info'

interface StatusMeta {
  tone: Tone
  label: string
}

const STATUS_MAP: Record<StatusKind, StatusMeta> = {
  shortage: { tone: 'danger', label: 'Shortage' },
  complete: { tone: 'success', label: 'Complete' },
  surplus: { tone: 'warning', label: 'Surplus' },
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  present: { tone: 'success', label: 'Present' },
  // Deliberately neutral, not danger — Absent is a normal daily state,
  // not an alert. Phase 3 §5.
  absent: { tone: 'neutral', label: 'Absent' },
  active: { tone: 'success', label: 'Active' },
  inactive: { tone: 'neutral', label: 'Inactive' },
  info: { tone: 'info', label: 'Info' },
}

export function statusMeta(kind: StatusKind): StatusMeta {
  return STATUS_MAP[kind]
}

/** Derives shortage/complete/surplus from a numeric variation — the
 * canonical Requirement/Filled/Variation → status mapping (Phase 1 §16). */
export function statusFromVariation(variation: number): StatusKind {
  if (variation < 0) return 'shortage'
  if (variation === 0) return 'complete'
  return 'surplus'
}

export const TONE_CLASSES: Record<Tone, { text: string; bg: string; border: string; solidBg: string }> = {
  success: {
    text: 'text-(--color-success)',
    bg: 'bg-(--color-success-tint)',
    border: 'border-(--color-success)',
    solidBg: 'bg-(--color-success)',
  },
  danger: {
    text: 'text-(--color-danger)',
    bg: 'bg-(--color-danger-tint)',
    border: 'border-(--color-danger)',
    solidBg: 'bg-(--color-danger)',
  },
  warning: {
    text: 'text-(--color-warning)',
    bg: 'bg-(--color-warning-tint)',
    border: 'border-(--color-warning)',
    solidBg: 'bg-(--color-warning)',
  },
  neutral: {
    text: 'text-(--color-neutral)',
    bg: 'bg-(--color-neutral-tint)',
    border: 'border-(--color-neutral)',
    solidBg: 'bg-(--color-neutral)',
  },
  info: {
    text: 'text-(--color-primary)',
    bg: 'bg-(--color-primary-tint)',
    border: 'border-(--color-primary)',
    solidBg: 'bg-(--color-primary)',
  },
}
