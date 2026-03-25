/**
 * Appointment status configuration - shared between PlanningModule and mobile screens
 */

import {
  CircleDot, CheckCircle2, PlayCircle, Check, XCircle, AlertTriangle, PauseCircle
} from 'lucide-react';

// Status icons and colors
export const STATUS_CONFIG = {
  scheduled: { icon: CircleDot, color: 'text-yellow-600', bg: 'bg-yellow-100', title: 'scheduled' },
  confirmed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', title: 'confirmed' },
  in_progress: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', title: 'in_progress' },
  completed: { icon: Check, color: 'text-gray-600', bg: 'bg-gray-100', title: 'completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', title: 'cancelled' },
  no_show: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', title: 'no_show' },
  interrupted: { icon: PauseCircle, color: 'text-purple-600', bg: 'bg-purple-100', title: 'interrupted' }
};

// Allowed status transitions: current status → array of allowed next statuses
export const STATUS_TRANSITIONS = {
  scheduled: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'interrupted'],
  completed: [],
  cancelled: ['scheduled'],
  no_show: ['scheduled'],
  interrupted: []
};
