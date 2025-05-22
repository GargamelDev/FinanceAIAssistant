namespace FinanceChatApi.Models;

public class Transaction
{
    public string TransactionDate { get; set; } = string.Empty;
    public string OperationDescription { get; set; } = string.Empty;
    public string Account { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Amount { get; set; } = string.Empty;
    public string AssignedCategory { get; set; } = string.Empty;
} 