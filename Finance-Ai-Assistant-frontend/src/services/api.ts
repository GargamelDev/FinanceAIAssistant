import axios from "axios";
import type { ChatMessage, Transaction } from "../types/Transaction";

//const API_URL = "http://localhost:5116/api/Finance";
const API_URL = "https://financeaiassistant-1.onrender.com/api/finance";

// Add axios interceptors for logging
axios.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    console.log("Request headers:", config.headers);
    console.log("Request data:", config.data);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log(
      `✅ API Response: ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`
    );
    console.log("Response status:", response.status);
    console.log("Response data:", response.data);
    return response;
  },
  (error) => {
    console.error("❌ Response Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const api = {
  async sendMessage(messages: ChatMessage[]) {
    try {
      console.log("📤 Sending chat message...");
      const response = await axios.post(`${API_URL}/chat`, { messages });
      console.log("📥 Chat response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("💥 sendMessage failed:", error);
      throw error;
    }
  },

  async uploadTransactions(file: File) {
    try {
      console.log(
        "📤 Uploading transactions file:",
        file.name,
        "Size:",
        file.size
      );
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
      console.log("📥 Upload response received:", response.data);
      return response.data as {
        transactions: Transaction[];
        uncategorizedTransactions: Transaction[];
      };
    } catch (error) {
      console.error("💥 uploadTransactions failed:", error);
      throw error;
    }
  },

  async assignCategory(transaction: Transaction, userInput: string) {
    try {
      console.log(
        "📤 Assigning category for transaction:",
        transaction.operationDescription
      );
      const response = await axios.post(
        `${API_URL}/transactions/assign-category`,
        {
          transactionDate: transaction.transactionDate,
          operationDescription: transaction.operationDescription,
          userInput,
        }
      );
      console.log("📥 Category assignment response:", response.data);
      return response.data as { transaction: Transaction; category: string };
    } catch (error) {
      console.error("💥 assignCategory failed:", error);
      throw error;
    }
  },

  async getTransactions() {
    try {
      console.log("📤 Getting transactions...");
      const response = await axios.get(`${API_URL}/transactions`);
      console.log(
        "📥 Transactions received:",
        response.data?.length,
        "transactions"
      );
      return response.data as Transaction[];
    } catch (error) {
      console.error("💥 getTransactions failed:", error);
      throw error;
    }
  },

  async assignTransactions() {
    try {
      console.log("📤 Auto-assigning transactions...");
      const response = await axios.post(`${API_URL}/transactions/assign`);
      console.log("📥 Auto-assignment completed:", response.data);
      return response.data;
    } catch (error) {
      console.error("💥 assignTransactions failed:", error);
      throw error;
    }
  },
};
