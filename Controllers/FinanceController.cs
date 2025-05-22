using Microsoft.AspNetCore.Mvc;
using FinanceChatApi.Models;
using FinanceChatApi.Services;

namespace FinanceChatApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinanceController : ControllerBase
{
    private readonly OpenAIService _openAIService;
    private readonly CsvService _csvService;
    private static List<Transaction> _transactions = new();

    public FinanceController(OpenAIService openAIService, CsvService csvService)
    {
        _openAIService = openAIService;
        _csvService = csvService;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (request == null || request.Messages == null || !request.Messages.Any())
        {
            return BadRequest(new { error = "Invalid request format. Please provide messages array." });
        }

        try
        {
            var response = await _openAIService.GetChatCompletionAsync(request.Messages, request.IncludeTransactions ? _transactions : null);
            return Ok(new { content = response });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/upload")]
    public async Task<IActionResult> UploadTransactions(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        try
        {
            var transactions = await _csvService.ParseTransactionsAsync(file);
            _transactions = transactions;
            return Ok(transactions);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/assign-category")]
    public async Task<IActionResult> AssignCategory([FromBody] CategoryAssignmentRequest request)
    {
        try
        {
            var transaction = _transactions.FirstOrDefault(t =>
                t.TransactionDate == request.TransactionDate &&
                t.OperationDescription == request.OperationDescription);

            if (transaction == null)
            {
                return NotFound("Transaction not found");
            }

            var categoryAssignment = await _openAIService.AssignCategoryToTransaction(request.UserInput);
            transaction.AssignedCategory = categoryAssignment.category;

            return Ok(new
            {
                transaction = transaction,
                category = categoryAssignment.category
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/assign")]
    public async Task<IActionResult> AssignAllCategories()
    {
        foreach (var transaction in _transactions.Where(x => String.IsNullOrEmpty(x.AssignedCategory)).Take(10))
        {
            var categoryAssignment = await _openAIService.AssignCategoryToTransaction(transaction.OperationDescription);
            transaction.AssignedCategory = categoryAssignment.category;
            Thread.Sleep(100);
        }
        return Ok(_transactions);
    }

    [HttpPost("transactions/category-chat")]
    public async Task<IActionResult> CategoryChat([FromBody] CategoryChatRequest request)
    {
        try
        {
            var response = await _openAIService.GetChatCompletionAsync(
                new List<ChatMessage>
                {
                    new ChatMessage
                    {
                        Role = "system",
                        Content = "You are a helpful assistant that helps users categorize their transactions. Available categories are: Basic Outcomes, Financial Freedom, Emergency Fund, Education, Kids Education, Pleasures. You can also help split transactions between multiple categories. Keep responses concise and focused on category assignment."
                    },
                    new ChatMessage
                    {
                        Role = "user",
                        Content = request.Message
                    }
                }
            );

            return Ok(new { response });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("transactions")]
    public IActionResult GetTransactions()
    {
        return Ok(_transactions);
    }
}

public class ChatRequest
{
    public List<ChatMessage> Messages { get; set; } = new();
    public bool IncludeTransactions { get; set; } = true;
}

public class CategoryAssignmentRequest
{
    public string TransactionDate { get; set; } = string.Empty;
    public string OperationDescription { get; set; } = string.Empty;
    public string UserInput { get; set; } = string.Empty;
}

public class CategoryChatRequest
{
    public string Message { get; set; } = string.Empty;
} 