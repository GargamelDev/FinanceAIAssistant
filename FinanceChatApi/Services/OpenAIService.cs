using System.Text.Json;
using Microsoft.Extensions.Configuration;
using OpenAI.ObjectModels.RequestModels;
using OpenAI.ObjectModels.ResponseModels;
using OpenAI.Interfaces;
using OpenAI.ObjectModels;
using OpenAI.Extensions;
using FinanceChatApi.Models;
using FinanceChatApi.Prompts;
using ChatMessage = OpenAI.ObjectModels.RequestModels.ChatMessage;

namespace FinanceChatApi.Services;

public class OpenAIService : IOpenAIService
{
    private readonly OpenAI.Interfaces.IOpenAIService _openAIService;

    public OpenAIService(IConfiguration configuration)
    {
        var apiKey = configuration["OpenAI:ApiKey"] ?? throw new ArgumentNullException("OpenAI:ApiKey");
        _openAIService = new OpenAI.Managers.OpenAIService(new OpenAI.OpenAiOptions() { ApiKey = apiKey });
    }

    public async Task<string> GetChatCompletionAsync(List<FinanceChatApi.Models.ChatMessage> messages, List<Transaction>? transactions = null)
    {
        var chatMessages = new List<ChatMessage>();

        // Add system message with transaction context if available
        if (transactions != null && transactions.Any())
        {
            var transactionContext = $"You have access to the following transactions:\n{string.Join("\n", transactions.Select(t => $"- {t.OperationDescription}: {t.Amount} PLN ({t.Category})"))}";
            chatMessages.Add(new ChatMessage(StaticValues.ChatMessageRoles.System, transactionContext));
        }

        // Add user messages
        chatMessages.AddRange(messages.Select(m => new ChatMessage(
            m.Role.ToLower() switch
            {
                "user" => StaticValues.ChatMessageRoles.User,
                "assistant" => StaticValues.ChatMessageRoles.Assistant,
                "system" => StaticValues.ChatMessageRoles.System,
                _ => StaticValues.ChatMessageRoles.User
            },
            m.Content
        )));

        var chatRequest = new ChatCompletionCreateRequest
        {
            Messages = chatMessages,
            Model = OpenAI.ObjectModels.Models.Gpt_4
        };

        var response = await _openAIService.ChatCompletion.CreateCompletion(chatRequest);
        if (response.Successful)
        {
            return response.Choices.First().Message.Content ?? string.Empty;
        }

        throw new Exception($"Failed to get chat completion: {response.Error?.Message}");
    }

    public async Task<CategoryAssignment> AssignCategoryToTransaction(string description)
    {
        var messages = new List<ChatMessage>
        {
            new(StaticValues.ChatMessageRoles.System, CategoryAssignmentPrompt.Prompt),
            new(StaticValues.ChatMessageRoles.User, description)
        };

        var chatRequest = new ChatCompletionCreateRequest
        {
            Messages = messages,
            Model = OpenAI.ObjectModels.Models.Gpt_4
        };

        var response = await _openAIService.ChatCompletion.CreateCompletion(chatRequest);
        if (response.Successful)
        {
            var content = response.Choices.First().Message.Content;
            if (string.IsNullOrEmpty(content))
            {
                throw new Exception("Empty response from OpenAI");
            }

            try
            {
                // Try to parse the response as JSON
                var result = JsonSerializer.Deserialize<CategoryAssignment>(content);
                if (result == null)
                {
                    throw new Exception("Failed to deserialize category assignment");
                }
                return result;
            }
            catch (JsonException)
            {
                // If JSON parsing fails, try to extract category from text
                var lines = content.Split('\n');
                var categoryLine = lines.FirstOrDefault(l => l.Contains("category") || l.Contains("Category"));
                if (categoryLine != null)
                {
                    var category = categoryLine.Split(':').Last().Trim().Trim('"', '\'', ' ', ',', '}');
                    return new CategoryAssignment
                    {
                        _thoughts = "Category extracted from text response",
                        category = category
                    };
                }
                throw new Exception("Could not extract category from response");
            }
        }

        throw new Exception($"Failed to get category assignment: {response.Error?.Message}");
    }
}

public class CategoryAssignment
{
    public string _thoughts { get; set; } = string.Empty;
    public string category { get; set; } = string.Empty;
} 