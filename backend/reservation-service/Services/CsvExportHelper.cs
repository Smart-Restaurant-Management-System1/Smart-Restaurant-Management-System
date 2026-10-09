using System.Text;

namespace ReservationService.Services;

/// <summary>
/// Helper for generating RFC 4180-compliant CSV exports with spreadsheet formula injection protection (SR-248).
/// Escapes formula trigger characters ('=', '+', '-', '@') by prefixing with a single quote (').
/// </summary>
public static class CsvExportHelper
{
    private static readonly char[] FormulaTriggers = ['=', '+', '-', '@'];

    /// <summary>
    /// Escapes a single CSV cell value according to RFC 4180 and sanitizes potential formula injection attacks.
    /// </summary>
    public static string EscapeCsvField(string? field)
    {
        if (string.IsNullOrEmpty(field))
        {
            return string.Empty;
        }

        var text = field;

        // SR-248 & SR-249: Formula injection mitigation
        if (FormulaTriggers.Contains(text[0]))
        {
            text = "'" + text;
        }

        // RFC 4180 escaping for quotes, commas, newlines
        if (text.Contains(',') || text.Contains('"') || text.Contains('\n') || text.Contains('\r'))
        {
            return $"\"{text.Replace("\"", "\"\"")}\"";
        }

        return text;
    }

    /// <summary>
    /// Generates UTF-8 (with BOM) encoded CSV file bytes from headers and row collections.
    /// </summary>
    public static byte[] BuildCsv(IEnumerable<string> headers, IEnumerable<IEnumerable<string?>> rows)
    {
        var builder = new StringBuilder();

        builder.AppendLine(string.Join(",", headers.Select(EscapeCsvField)));

        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsvField)));
        }

        var encoding = new UTF8Encoding(true);
        var preamble = encoding.GetPreamble();
        var body = encoding.GetBytes(builder.ToString());

        var result = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, result, preamble.Length, body.Length);
        return result;
    }
}
