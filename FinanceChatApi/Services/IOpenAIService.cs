using FinanceChatApi.Models;

namespace FinanceChatApi.Services;

public interface IOpenAIService
{
    Task<string> GetChatCompletionAsync(List<ChatMessage> messages, List<Transaction>? transactions = null);
    Task<CategoryAssignment> AssignCategoryToTransaction(string description);
} 