export type ReportStatus = "NEW" | "IN_PROGRESS" | "DONE";

export type Report = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  surfaceM2?: string | null;
  budgetAmount?: string | null;
  progressPercent?: number | null;
  userId?: string | null;
};

