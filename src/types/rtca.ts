export interface RTCARecord {
  id: string;
  company_id: string;
  location_id: string;
  scheme_id: string;
  coordinator_id: string;
  requirement: number;
  filled: number;
  vacant: number;
  remarks: string | null;
  report_date: string;
  updated_at: string;
}

export interface RTCAOption {
  id: string;
  label: string;
}

export interface RTCAFilters {
  companyId: string;
  locationId: string;
  schemeId: string;
  coordinatorId: string;
  dateFrom: string;
  dateTo: string;
}

export interface RTCARow extends RTCARecord {
  companyName: string;
  locationName: string;
  stateName?: string;
  cityName?: string;
  districtName?: string;
  schemeName: string;
  coordinatorName: string;
}

export interface RTCAStats {
  companies: number;
  locations: number;
  requirement: number;
  filled: number;
  vacant: number;
  fillRate: number;
}
