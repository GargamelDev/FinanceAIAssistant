using FinanceChatApi.Models;

namespace FinanceChatApi.Services;

public interface ICsvService
{
    Task<List<Transaction>> ParseTransactionsAsync(IFormFile file);
} 