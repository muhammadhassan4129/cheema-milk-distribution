export type Role = 'Admin' | 'MilkTester' | 'Accountant' | 'Driver';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  sidebarCollapsed?: boolean;
}

export interface User {
  id: string;
  name: string;
  fullName?: string; // backend se aata hai
  username: string;
  role: Role;
  preferences?: UserPreferences;
}

export interface RouteStop {
  id: string;
  name: string;
}

export interface Route {
  id: string;
  name: string;
  stops: RouteStop[]; // up to 5 locations, or more as needed
  length: string; // e.g., '1200 km'
  travelTime: string; // e.g., '15 hrs 30 mins'
  cost: number;
  isCustom?: boolean;
  tankerNumber?: string;
  mtName?: string;
  assignedMilkTesterIds?: string[]; // Array of User IDs (Driver role)
}

export type TestResult = 'Pass' | 'Fail' | 'Pending';

export interface MilkCollectionStop {
  id: string;
  time: string;
  locationName: string;
  milkLiter: number;
  snf: number;
  totalSolids: number;
  ts13: number;
  fat: number;
  lr: number;
  milkKgs: number;
  temperature?: number;
  price?: number;
  totalPayable?: number;
  organoTest: TestResult | string;
  glucoseTest: TestResult | string;
  starchTest: TestResult | string;
  aptTest: TestResult | string;
  abTest: TestResult | string;
  remarks: string;
}

export interface RouteCollectionReceiving {
  locationName: string;
  time: string;
  milkKgs: number;
  milkLiter: number;
  fat: number;
  lr: number;
  snf: number;
  temperature: number;
}

export interface RouteCollection {
  id: string;
  date: string;
  routeName: string;
  tankerNumber: string;
  mtName: string;
  stops: MilkCollectionStop[];
  status: 'Draft' | 'Submitted' | 'Received' | 'Lab Tested';
  receiving?: RouteCollectionReceiving;
  driverId?: string; // MilkTester ka user ID — filtering ke liye
}
