export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  threatBlocked?: boolean;
  threatDetails?: string;
  executiveSummary?: string;
  actionItems?: ActionItem[];
  sentiment?: string;
  sentimentScore?: number;
  tags?: string[];
}

export interface ActionItem {
  id: string;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'completed';
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  summary: string;
  tags: string[];
  actionItems: ActionItem[];
  sentiment: string;
  sentimentScore?: number;
  timestamp: any; // Firestore Timestamp or ISO string
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export interface ConstitutionRule {
  id: string;
  category: 'threat_defense' | 'credential_shield' | 'structured_output' | 'enterprise_policy';
  title: string;
  description: string;
  status: 'enforced' | 'monitoring';
  defenseRule: string;
}

export interface ChatApiResponse {
  reply: string;
  summary: string;
  actionItems: ActionItem[];
  sentiment: string;
  sentimentScore: number;
  tags: string[];
  threatBlocked: boolean;
  threatDetails?: string;
  journalId?: string;
}
