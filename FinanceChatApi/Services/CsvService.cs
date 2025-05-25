using CsvHelper;
using CsvHelper.Configuration;
using FinanceChatApi.Models;
using System.Globalization;
using System.Text;

namespace FinanceChatApi.Services;

public class CsvService : ICsvService
{
    public async Task<List<Transaction>> ParseTransactionsAsync(IFormFile file)
    {
        // Read all lines from the file
        var lines = new List<string>();
        using (var fileReader = new StreamReader(file.OpenReadStream()))
        {
            string? line;
            while ((line = await fileReader.ReadLineAsync()) != null)
            {
                lines.Add(line);
            }
        }

        // Find the index of the header row
        int headerIndex = -1;
        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Contains("Data operacji"))
            {
                headerIndex = i;
                break;
            }
        }

        if (headerIndex == -1)
        {
            throw new InvalidOperationException("Could not find transaction headers in the CSV file");
        }

        // Create a new stream with only the relevant data
        var csvContent = new StringBuilder();
        // Remove '#' characters from the header row
        var headerRow = lines[headerIndex].Replace("#", "");
        csvContent.AppendLine(headerRow);
        for (int i = headerIndex + 1; i < lines.Count; i++)
        {
            if (!string.IsNullOrWhiteSpace(lines[i]))
            {
                csvContent.AppendLine(lines[i]);
            }
        }

        using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(csvContent.ToString()));
        using var streamReader = new StreamReader(memoryStream);

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = ";",
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null
        };

        using var csv = new CsvReader(streamReader, config);
        
        // Register the mapping
        csv.Context.RegisterClassMap<TransactionMap>();

        // Read the header
        await csv.ReadAsync();
        csv.ReadHeader();

        var records = new List<Transaction>();
        while (await csv.ReadAsync())
        {
            var record = new Transaction
            {
                TransactionDate = csv.GetField("Data operacji") ?? string.Empty,
                OperationDescription = csv.GetField("Opis operacji") ?? string.Empty,
                Account = csv.GetField("Rachunek") ?? string.Empty,
                Category = csv.GetField("Kategoria") ?? string.Empty,
                Amount = csv.GetField("Kwota") ?? string.Empty
            };
            records.Add(record);
        }

        return records;
    }
}

public sealed class TransactionMap : ClassMap<Transaction>
{
    public TransactionMap()
    {
        Map(m => m.TransactionDate).Name("Data operacji");
        Map(m => m.OperationDescription).Name("Opis operacji");
        Map(m => m.Account).Name("Rachunek");
        Map(m => m.Category).Name("Kategoria");
        Map(m => m.Amount).Name("Kwota");
    }
} 