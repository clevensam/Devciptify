export interface GitHubLanguage {
  name: string;
  color: string;
  percentage: number;
}

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ReceiptData {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  followers: number;
  following: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  totalContributions: number;
  codingHours: number;
  energyLevel: number;
  energyLevelLabel: string;
  topLanguages: GitHubLanguage[];
  streak: number;
  contributionHistory: ContributionDay[];
  orderNumber: string;
  date: string;
  simulated: boolean;
}
