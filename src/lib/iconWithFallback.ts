import { type ComponentType } from "react";
import { FileText } from "lucide-react";

export const getIconWithFallback = (iconMap: Record<string, ComponentType>, iconKey?: string) => {
  if (!iconKey) return FileText;
  return iconMap[iconKey] || FileText;
};
