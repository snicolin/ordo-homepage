import {
  Info,
  AlertTriangle,
  AlertCircle,
  Bell,
  Megaphone,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AlertIconOption = {
  value: string;
  label: string;
  Icon: LucideIcon;
};

export const ALERT_ICONS: AlertIconOption[] = [
  { value: "INFO", label: "Info", Icon: Info },
  { value: "ALERT_TRIANGLE", label: "Warning", Icon: AlertTriangle },
  { value: "ALERT_CIRCLE", label: "Alert", Icon: AlertCircle },
  { value: "BELL", label: "Bell", Icon: Bell },
  { value: "MEGAPHONE", label: "Megaphone", Icon: Megaphone },
  { value: "CALENDAR", label: "Calendar", Icon: Calendar },
];

export const ALERT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ALERT_ICONS.map((i) => [i.value, i.Icon])
);
