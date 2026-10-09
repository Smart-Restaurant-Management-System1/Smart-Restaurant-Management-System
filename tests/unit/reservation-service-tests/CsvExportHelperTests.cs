using System.Text;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class CsvExportHelperTests
{
    [Theory]
    [InlineData("=cmd|'/C calc'!A0", "'=cmd|'/C calc'!A0")]
    [InlineData("+123456789", "'+123456789")]
    [InlineData("-SUM(A1:A10)", "'-SUM(A1:A10)")]
    [InlineData("@SUM(A1:A10)", "'@SUM(A1:A10)")]
    public void EscapeCsvField_FormulaInjectionTriggers_SanitizesWithLeadingQuote(string input, string expected)
    {
        var result = CsvExportHelper.EscapeCsvField(input);

        Assert.Equal(expected, result);
        Assert.StartsWith("'", result);
    }

    [Fact]
    public void EscapeCsvField_NullOrEmpty_ReturnsEmptyString()
    {
        Assert.Equal(string.Empty, CsvExportHelper.EscapeCsvField(null));
        Assert.Equal(string.Empty, CsvExportHelper.EscapeCsvField(string.Empty));
    }

    [Fact]
    public void EscapeCsvField_FieldWithComma_WrapsInQuotes()
    {
        var result = CsvExportHelper.EscapeCsvField("Colombo, Sri Lanka");

        Assert.Equal("\"Colombo, Sri Lanka\"", result);
    }

    [Fact]
    public void EscapeCsvField_FieldWithQuotes_DoublesQuotesAndWraps()
    {
        var result = CsvExportHelper.EscapeCsvField("VIP \"Exclusive\" Table");

        Assert.Equal("\"VIP \"\"Exclusive\"\" Table\"", result);
    }

    [Fact]
    public void EscapeCsvField_FieldWithNewlines_WrapsInQuotes()
    {
        var result = CsvExportHelper.EscapeCsvField("Line 1\nLine 2");

        Assert.Equal("\"Line 1\nLine 2\"", result);
    }

    [Fact]
    public void BuildCsv_HeadersAndRows_OutputsValidUtf8BomBytes()
    {
        var headers = new[] { "ID", "Name", "Total" };
        var rows = new[]
        {
            new[] { "1", "Alice", "1500.00" },
            new[] { "2", "=HYPERLINK(\"http://evil.com\")", "2500.50" }
        };

        var bytes = CsvExportHelper.BuildCsv(headers, rows);

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 3);

        // UTF-8 BOM check: EF, BB, BF
        Assert.Equal(0xEF, bytes[0]);
        Assert.Equal(0xBB, bytes[1]);
        Assert.Equal(0xBF, bytes[2]);

        var content = Encoding.UTF8.GetString(bytes);
        Assert.Contains("ID,Name,Total", content);
        Assert.Contains("1,Alice,1500.00", content);
        Assert.Contains("2,\"'=HYPERLINK(\"\"http://evil.com\"\")\",2500.50", content);
    }
}
