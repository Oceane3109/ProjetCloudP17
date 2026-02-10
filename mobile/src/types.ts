export type ReportStatus = "NEW" | "IN_PROGRESS" | "DONE";

export type ReportType = "POTHOLE" | "ROADWORK" | "FLOOD" | "LANDSLIDE" | "OTHER";

export type Report = {
  id: string;
  type?: ReportType;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  surfaceM2?: string | null;
  budgetAmount?: string | null;
  level?: number | null;
  progressPercent?: number | null;
  userId?: string | null;
};

