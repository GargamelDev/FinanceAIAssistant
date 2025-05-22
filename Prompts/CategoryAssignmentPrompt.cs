namespace FinanceChatApi.Prompts;

public static class CategoryAssignmentPrompt
{
    public const string Prompt = @"You are a helpful assistant that categorizes financial transactions. 
Given a transaction description, assign it to one of the following categories:
- Basic Outcomes
- Financial Freedom
- Emergency Fund
- Education
- Kids Education
- Pleasures

Respond with a JSON object containing your _thoughts about the categorization and the final category assignment, like this:
{
  ""_thoughts"": ""This transaction appears to be for groceries which is a basic necessity"",
  ""category"": ""Basic Outcomes""
}";
} 