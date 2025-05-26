import axios from "axios";
import { track } from "@vercel/analytics";
import type { ChatMessage, Transaction } from "../types/Transaction";

//const API_URL = "http://localhost:5116/api/Finance";
const API_URL = "https://financeaiassistant-1.onrender.com/api/finance";

// Enhanced logging for Vercel Analytics
const log = {
  info: (message: string, data?: any) => {
    console.log(
      `[INFO] ${new Date().toISOString()} - ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
    // Track events in Vercel Analytics
    track("api_info", { message, ...data });
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    // Track errors in Vercel Analytics
    track("api_error", { message, error: error?.message || "Unknown error" });
  },
  request: (method: string, url: string, data?: any) => {
    console.log(
      `[REQUEST] ${new Date().toISOString()} - ${method.toUpperCase()} ${url}`
    );
    if (data) {
      console.log(
        `[REQUEST_DATA]`,
        typeof data === "object" ? JSON.stringify(data, null, 2) : data
      );
    }
    track("api_request", { method: method.toUpperCase(), url });
  },
  response: (method: string, url: string, status: number, data?: any) => {
    console.log(
      `[RESPONSE] ${new Date().toISOString()} - ${method.toUpperCase()} ${url} - Status: ${status}`
    );
    if (data) {
      console.log(
        `[RESPONSE_DATA]`,
        typeof data === "object" ? JSON.stringify(data, null, 2) : data
      );
    }
    track("api_response", { method: method.toUpperCase(), url, status });
  },
};

// Add axios interceptors for enhanced logging
axios.interceptors.request.use(
  (config) => {
    log.request(
      config.method || "UNKNOWN",
      config.url || "UNKNOWN",
      config.data
    );
    return config;
  },
  (error) => {
    log.error("Request interceptor error", error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    log.response(
      response.config.method || "UNKNOWN",
      response.config.url || "UNKNOWN",
      response.status,
      response.data
    );
    return response;
  },
  (error) => {
    log.error("API Response Error", {
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
      log.info("Sending chat message", { messageCount: messages.length });
      const response = await axios.post(`${API_URL}/chat`, { messages });
      log.info("Chat response received successfully");
      return response.data;
    } catch (error) {
      log.error("sendMessage failed", error);
      throw error;
    }
  },

  async uploadTransactions(file: File) {
    try {
      log.info("Uploading transactions file", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
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
      log.info("Upload response received successfully", {
        transactionCount: response.data?.transactions?.length || 0,
        uncategorizedCount:
          response.data?.uncategorizedTransactions?.length || 0,
      });
      return response.data as {
        transactions: Transaction[];
        uncategorizedTransactions: Transaction[];
      };
    } catch (error) {
      log.error("uploadTransactions failed", error);
      throw error;
    }
  },

  async assignCategory(transaction: Transaction, userInput: string) {
    try {
      log.info("Assigning category for transaction", {
        description: transaction.operationDescription,
        userInput: userInput,
      });
      const response = await axios.post(
        `${API_URL}/transactions/assign-category`,
        {
          transactionDate: transaction.transactionDate,
          operationDescription: transaction.operationDescription,
          userInput,
        }
      );
      log.info("Category assignment response received", {
        category: response.data?.category,
      });
      return response.data as { transaction: Transaction; category: string };
    } catch (error) {
      log.error("assignCategory failed", error);
      throw error;
    }
  },

  async getTransactions() {
    try {
      log.info("Getting transactions");
      const response = await axios.get(`${API_URL}/transactions`);
      log.info("Transactions received successfully", {
        count: response.data?.length || 0,
      });
      return response.data as Transaction[];
    } catch (error) {
      log.error("getTransactions failed", error);
      throw error;
    }
  },

  async assignTransactions() {
    try {
      log.info("Auto-assigning transactions");
      const response = await axios.post(`${API_URL}/transactions/assign`);
      log.info("Auto-assignment completed successfully");
      return response.data;
    } catch (error) {
      log.error("assignTransactions failed", error);
      throw error;
    }
  },
};
