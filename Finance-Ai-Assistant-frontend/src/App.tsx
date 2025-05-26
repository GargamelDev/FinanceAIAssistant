import { useState, useEffect } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { api } from "./services/api";
import type { Transaction, ChatMessage } from "./types/Transaction";
import { CategoryAssignmentDialog } from "./components/CategoryAssignmentDialog";

// Create a light theme
const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2196f3",
      light: "#64b5f6",
      dark: "#1976d2",
    },
    secondary: {
      main: "#4caf50",
      light: "#81c784",
      dark: "#388e3c",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

function App() {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load transactions from localStorage on initial render
    const savedTransactions = localStorage.getItem("transactions");
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });
  const [loading, setLoading] = useState(false);
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<
    Transaction[]
  >([]);
  const [currentUncategorizedIndex, setCurrentUncategorizedIndex] = useState(0);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions();
      if (data && data.length > 0) {
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const response = await api.uploadTransactions(file);
      if (Array.isArray(response)) {
        setTransactions(response);
        console.log("Transactions after upload:", response);
      } else {
        console.error("Invalid response format:", response);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignByUser = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowCategoryDialog(true);
  };

  const handleCategoryAssign = async (categoryString: string) => {
    if (!selectedTransaction) return;

    try {
      const response = await api.assignCategory(
        selectedTransaction,
        categoryString
      );

      // Update the transaction in the main list with the new assignedCategory
      setTransactions((prevTransactions) =>
        prevTransactions.map((t) =>
          t.transactionDate === response.transaction.transactionDate &&
          t.operationDescription === response.transaction.operationDescription
            ? { ...response.transaction, assignedCategory: categoryString }
            : t
        )
      );

      setShowCategoryDialog(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error("Error assigning category:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: ChatMessage = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");

    try {
      const response = await api.sendMessage([...messages, newMessage]);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAssignTransactions = async () => {
    try {
      await api.assignTransactions();
      // Optionally reload transactions to reflect new assignments
      await loadTransactions();
      // Optionally show a notification
      alert("Transactions assigned successfully!");
    } catch (error) {
      alert("Failed to assign transactions.");
      console.error(error);
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          minWidth: "100vw",
          backgroundColor: lightTheme.palette.background.default,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "100%",
            maxWidth: 800,
            mx: "auto",
            mb: 4,
            p: 4,
            borderRadius: 4,
            boxShadow: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            backgroundColor: lightTheme.palette.background.paper,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: lightTheme.palette.primary.main,
              fontWeight: "bold",
              textAlign: "center",
              mb: 2,
            }}
          >
            Financial Chat Assistant
          </Typography>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              mb: 2,
              "& .MuiButton-root": {
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
                borderRadius: 2,
                boxShadow: 2,
                "&:hover": {
                  transform: "translateY(-2px)",
                  transition: "transform 0.2s",
                },
              },
            }}
          >
            <input
              accept=".csv"
              style={{ display: "none" }}
              id="raised-button-file"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="raised-button-file">
              <Button
                variant="contained"
                component="span"
                disabled={loading}
                color="primary"
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Upload Transactions CSV"
                )}
              </Button>
            </label>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleAssignTransactions}
            >
              Assign Transactions
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleAssignByUser(transactions[0])}
              disabled={!transactions.length}
            >
              Assign By User
            </Button>
          </Box>

          {uncategorizedTransactions.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {uncategorizedTransactions.length} transactions need category
              assignment
            </Alert>
          )}

          <Box
            sx={{
              width: "100%",
              display: "flex",
              gap: 2,
              mb: 2,
              "& .MuiTextField-root": {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover fieldset": {
                    borderColor: lightTheme.palette.primary.main,
                  },
                },
              },
              "& .MuiButton-root": {
                borderRadius: 2,
                px: 4,
              },
            }}
          >
            <TextField
              fullWidth
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about your transactions..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              color="primary"
            >
              Send
            </Button>
          </Box>

          <Box sx={{ width: "100%" }}>
            {messages.map((message, index) => (
              <Paper
                key={index}
                elevation={2}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor:
                    message.role === "user"
                      ? alpha(lightTheme.palette.primary.main, 0.1)
                      : alpha(lightTheme.palette.secondary.main, 0.1),
                  border: `1px solid ${
                    message.role === "user"
                      ? lightTheme.palette.primary.main
                      : lightTheme.palette.secondary.main
                  }`,
                  "&:hover": {
                    transform: "translateX(4px)",
                    transition: "transform 0.2s",
                  },
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color:
                      message.role === "user"
                        ? lightTheme.palette.primary.main
                        : lightTheme.palette.secondary.main,
                    fontWeight: 500,
                  }}
                >
                  {message.content}
                </Typography>
              </Paper>
            ))}
          </Box>

          {transactions && transactions.length > 0 && (
            <TableContainer
              component={Paper}
              sx={{
                width: "100%",
                borderRadius: 2,
                boxShadow: 3,
                overflowX: "auto",
                minWidth: 800,
                "& .MuiTableHead-root": {
                  backgroundColor: alpha(lightTheme.palette.primary.main, 0.1),
                  "& .MuiTableCell-head": {
                    color: lightTheme.palette.primary.main,
                    fontWeight: "bold",
                  },
                },
                "& .MuiTableRow-root:hover": {
                  backgroundColor: alpha(lightTheme.palette.primary.main, 0.05),
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Date</TableCell>
                    <TableCell>Operation Description</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Assigned Category</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.transactionDate}</TableCell>
                      <TableCell>{transaction.operationDescription}</TableCell>
                      <TableCell>{transaction.account}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.assignedCategory}</TableCell>
                      <TableCell>{transaction.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <CategoryAssignmentDialog
            open={showCategoryDialog}
            transaction={selectedTransaction}
            onClose={() => {
              setShowCategoryDialog(false);
              setSelectedTransaction(null);
            }}
            onAssign={handleCategoryAssign}
          />
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default App;
