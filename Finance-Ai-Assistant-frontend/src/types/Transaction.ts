export interface Transaction {
  transactionDate: string;
  operationDescription: string;
  account: string;
  category: string;
  amount: string;
  assignedCategory?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
