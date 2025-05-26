import axios from "axios";
import type { ChatMessage, Transaction } from "../types/Transaction";

const API_URL = "http://localhost:5116/api/Finance";

export const api = {
  async sendMessage(messages: ChatMessage[]) {
    const response = await axios.post(`${API_URL}/chat`, { messages });
    return response.data;
  },

  async uploadTransactions(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(
      `${API_URL}/transactions/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data as {
      transactions: Transaction[];
      uncategorizedTransactions: Transaction[];
    };
  },

  async assignCategory(transaction: Transaction, userInput: string) {
    const response = await axios.post(
      `${API_URL}/transactions/assign-category`,
      {
        transactionDate: transaction.transactionDate,
        operationDescription: transaction.operationDescription,
        userInput,
      }
    );
    return response.data as { transaction: Transaction; category: string };
  },

  async getTransactions() {
    const response = await axios.get(`${API_URL}/transactions`);
    return response.data as Transaction[];
  },

  async assignTransactions() {
    const response = await axios.post(`${API_URL}/transactions/assign`);
    return response.data;
  },
};
