using Microsoft.AspNetCore.Mvc;
using FinanceChatApi.Models;
using FinanceChatApi.Services;

namespace FinanceChatApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinanceController(IOpenAIService openAIService, ICsvService csvService, ILogger<FinanceController> logger) : ControllerBase
{
    private static List<Transaction> _transactions = new();

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        logger.LogInformation("📥 Chat request received from {ClientIP}", HttpContext.Connection.RemoteIpAddress);
        
        if (request == null || request.Messages == null || !request.Messages.Any())
        {
            logger.LogWarning("❌ Invalid chat request format");
            return BadRequest(new { error = "Invalid request format. Please provide messages array." });
        }

        try
        {
            logger.LogInformation("🤖 Processing chat with {MessageCount} messages, Include transactions: {IncludeTransactions}", 
                request.Messages.Count, request.IncludeTransactions);
                
            var response = await openAIService.GetChatCompletionAsync(request.Messages, request.IncludeTransactions ? _transactions : null);
            
            logger.LogInformation("✅ Chat response generated successfully");
            return Ok(new { content = response });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "💥 Error processing chat request");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/upload")]
    public async Task<IActionResult> UploadTransactions(IFormFile file)
    {
        logger.LogInformation("📥 File upload request from {ClientIP}", HttpContext.Connection.RemoteIpAddress);
        
        if (file == null || file.Length == 0)
        {
            logger.LogWarning("❌ No file uploaded");
            return BadRequest("No file uploaded");
        }

        try
        {
            logger.LogInformation("📂 Processing file: {FileName}, Size: {FileSize} bytes", file.FileName, file.Length);
            
            var transactions = await csvService.ParseTransactionsAsync(file);
            _transactions = transactions;
            
            logger.LogInformation("✅ Successfully parsed {TransactionCount} transactions", transactions.Count);
            return Ok(transactions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "💥 Error processing file upload");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/assign-category")]
    public async Task<IActionResult> AssignCategory([FromBody] CategoryAssignmentRequest request)
    {
        logger.LogInformation("📥 Category assignment request for transaction: {Description}", request.OperationDescription);
        
        try
        {
            var transaction = _transactions.FirstOrDefault(t =>
                t.TransactionDate == request.TransactionDate &&
                t.OperationDescription == request.OperationDescription);

            if (transaction == null)
            {
                logger.LogWarning("❌ Transaction not found: {Date} - {Description}", request.TransactionDate, request.OperationDescription);
                return NotFound("Transaction not found");
            }

            logger.LogInformation("🤖 Requesting category assignment for: {UserInput}", request.UserInput);
            var categoryAssignment = await openAIService.AssignCategoryToTransaction(request.UserInput);
            transaction.AssignedCategory = categoryAssignment.category;

            logger.LogInformation("✅ Category assigned: {Category}", categoryAssignment.category);
            return Ok(new
            {
                transaction = transaction,
                category = categoryAssignment.category
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "💥 Error assigning category");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transactions/assign")]
    public async Task<IActionResult> AssignAllCategories()
    {
        logger.LogInformation("📥 Auto-assign all categories request from {ClientIP}", HttpContext.Connection.RemoteIpAddress);
        
        var unassignedTransactions = _transactions.Where(x => String.IsNullOrEmpty(x.AssignedCategory)).Take(10).ToList();
        logger.LogInformation("🔄 Processing {Count} unassigned transactions", unassignedTransactions.Count);
        
        foreach (var transaction in unassignedTransactions)
        {
            try
            {
                logger.LogInformation("🤖 Auto-assigning category for: {Description}", transaction.OperationDescription);
                var categoryAssignment = await openAIService.AssignCategoryToTransaction(transaction.OperationDescription);
                transaction.AssignedCategory = categoryAssignment.category;
                logger.LogInformation("✅ Auto-assigned category: {Category}", categoryAssignment.category);
                Thread.Sleep(100);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "💥 Error auto-assigning category for transaction: {Description}", transaction.OperationDescription);
            }
        }
        
        logger.LogInformation("✅ Auto-assignment completed");
        return Ok(_transactions);
    }

    [HttpPost("transactions/category-chat")]
    public async Task<IActionResult> CategoryChat([FromBody] CategoryChatRequest request)
    {
        logger.LogInformation("📥 Category chat request: {Message}", request.Message);
        
        try
        {
            var response = await openAIService.GetChatCompletionAsync(
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

            logger.LogInformation("✅ Category chat response generated");
            return Ok(new { response });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "💥 Error processing category chat");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("transactions")]
    public IActionResult GetTransactions()
    {
        logger.LogInformation("📥 Get transactions request from {ClientIP}, returning {Count} transactions", 
            HttpContext.Connection.RemoteIpAddress, _transactions.Count);
        return Ok(_transactions);
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        logger.LogInformation("📥 Test endpoint called from {ClientIP}", HttpContext.Connection.RemoteIpAddress);
        return Ok("test ok");
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