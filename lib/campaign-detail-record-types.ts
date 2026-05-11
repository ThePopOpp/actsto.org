export type CampaignUpdateItem = {
  id: string;
  title: string;
  body: string | null;
  publishedAt: string | null;
};

export type CampaignDonorItem = {
  id: string;
  displayName: string;
  amount: number | null;
  message: string | null;
  createdAt: string;
  isAnonymous: boolean;
  showAmount: boolean;
  showMessage: boolean;
};

export type CampaignFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type CampaignDetailRecords = {
  updates: CampaignUpdateItem[];
  donors: CampaignDonorItem[];
  faqs: CampaignFaqItem[];
};

