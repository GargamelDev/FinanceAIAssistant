import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import type { Transaction } from "../types/Transaction";
import axios from "axios";

// Configure axios base URL
axios.defaults.baseURL = "http://localhost:5116";

const CATEGORIES = [
  "Basic Outcomes",
  "Financial Freedom",
  "Emergency Fund",
  "Education",
  "Kids Education",
  "Pleasures",
] as const;

type Category = (typeof CATEGORIES)[number];

interface CategoryAssignmentDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onAssign: (category: string) => void;
}

export const CategoryAssignmentDialog: React.FC<
  CategoryAssignmentDialogProps
> = ({ open, transaction, onClose, onAssign }) => {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [amounts, setAmounts] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string>("");
  const [chatMessage, setChatMessage] = useState<string>("");
  const [chatResponse, setChatResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (transaction) {
      // Reset state when transaction changes
      setSelectedCategories([]);
      setAmounts({});
      setError("");

      // If there's an existing assigned category, parse it and set up the form
      if (transaction.assignedCategory) {
        const categoryEntries = transaction.assignedCategory.split(", ");
        const newCategories: Category[] = [];
        const newAmounts: { [key: string]: number } = {};

        categoryEntries.forEach((entry) => {
          const [category, amountStr] = entry.split(": ");
          if (CATEGORIES.includes(category as Category)) {
            newCategories.push(category as Category);
            newAmounts[category] = parseFloat(amountStr);
          }
        });

        setSelectedCategories(newCategories);
        setAmounts(newAmounts);
      }
    }
  }, [transaction]);

  const handleCategoryClick = (category: Category) => {
    if (!transaction) return;

    const transactionAmount = parseFloat(transaction.amount);
    const newSelectedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    // Calculate new amounts
    const newAmounts = { ...amounts };
    const numSelected = newSelectedCategories.length;

    if (numSelected > 0) {
      const amountPerCategory = transactionAmount / numSelected;
      newSelectedCategories.forEach((cat) => {
        newAmounts[cat] = amountPerCategory;
      });
    }

    setSelectedCategories(newSelectedCategories);
    setAmounts(newAmounts);
    validateAmounts(newAmounts, transactionAmount);
  };

  const handleAmountChange = (category: string, value: string) => {
    if (!transaction) return;

    const newAmounts = { ...amounts };
    newAmounts[category] = parseFloat(value) || 0;
    setAmounts(newAmounts);
    validateAmounts(newAmounts, parseFloat(transaction.amount));
  };

  const validateAmounts = (
    currentAmounts: { [key: string]: number },
    totalAmount: number
  ) => {
    const sum = Object.values(currentAmounts).reduce((a, b) => a + b, 0);
    const difference = Math.abs(sum - totalAmount);

    if (difference > 0.01) {
      // Using 0.01 to account for floating point precision
      setError(
        `Sum of amounts (${sum.toFixed(
          2
        )}) must equal transaction amount (${totalAmount.toFixed(2)})`
      );
    } else {
      setError("");
    }
  };

  const handleConfirm = () => {
    if (!transaction || error) return;

    const categoryString = Object.entries(amounts)
      .map(([category, amount]) => `${category}: ${amount.toFixed(2)}`)
      .join(", ");

    onAssign(categoryString);
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        "/api/Finance/transactions/category-chat",
        {
          message: chatMessage,
        }
      );
      setChatResponse(response.data.response);
    } catch (error) {
      setError("Failed to get chat response");
    } finally {
      setIsLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assign Categories</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Transaction Details:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Date: {transaction.transactionDate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Description: {transaction.operationDescription}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amount: {transaction.amount}
          </Typography>
          {transaction.assignedCategory && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current Assignment: {transaction.assignedCategory}
            </Typography>
          )}
        </Box>

        <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f5f5f5" }}>
          <Typography variant="subtitle2" gutterBottom>
            Need help categorizing? Chat with AI assistant:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask for help with categorization..."
              onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
            />
            <Button
              variant="contained"
              onClick={handleChatSubmit}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : "Send"}
            </Button>
          </Box>
          {chatResponse && (
            <Paper sx={{ p: 2, backgroundColor: "white" }}>
              <Typography variant="body2">{chatResponse}</Typography>
            </Paper>
          )}
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {CATEGORIES.map((category) => (
            <Grid item xs={12} sm={6} key={category} {...({} as any)}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Button
                  variant={
                    selectedCategories.includes(category as Category)
                      ? "contained"
                      : "outlined"
                  }
                  onClick={() => handleCategoryClick(category as Category)}
                  fullWidth
                >
                  {category}
                </Button>
                {selectedCategories.includes(category as Category) && (
                  <TextField
                    type="number"
                    value={amounts[category] || ""}
                    onChange={(e) =>
                      handleAmountChange(category, e.target.value)
                    }
                    size="small"
                    sx={{ width: "120px" }}
                    InputProps={{
                      inputProps: { step: "0.01" },
                    }}
                  />
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!!error || selectedCategories.length === 0}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};
