using System.Collections;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ReservationService.Services;

/// <summary>
/// Hardened sanitizer for audit metadata to guarantee zero secret leaks (SR-223 / SR-250).
/// Strictly redacts passwords, tokens, JWTs, card numbers, and connection strings.
/// </summary>
public static class AuditDataSanitizer
{
    private static readonly HashSet<string> SensitiveKeyPatterns = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "pwd",
        "passwordhash",
        "token",
        "accesstoken",
        "refreshtoken",
        "jwt",
        "secret",
        "secretkey",
        "hash",
        "cvv",
        "cvc",
        "creditcard",
        "cardnumber",
        "authorization",
        "bearer",
        "apikey",
        "connectionstring",
        "credentials"
    };

    private static readonly Regex JwtRegex = new(
        @"eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex ConnectionStringRegex = new(
        @"(Server|Data Source|User ID|Password|Pwd)=[^;]+;",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private const int MaxDetailsLength = 2048;

    /// <summary>
    /// Sanitizes an input object, dictionary, or string and serializes it to a safe JSON string.
    /// </summary>
    public static string? SanitizeAndSerialize(object? details)
    {
        if (details == null)
        {
            return null;
        }

        if (details is string rawString)
        {
            return MaskSensitiveString(rawString);
        }

        try
        {
            var sanitizedNode = SanitizeValue(details);
            var json = JsonSerializer.Serialize(sanitizedNode, new JsonSerializerOptions
            {
                WriteIndented = false
            });

            return json.Length > MaxDetailsLength ? json[..MaxDetailsLength] + "...[TRUNCATED]" : json;
        }
        catch
        {
            return "{\"warning\":\"Unable to serialize audit metadata\"}";
        }
    }

    private static object? SanitizeValue(object? value)
    {
        if (value == null)
        {
            return null;
        }

        if (value is string s)
        {
            return MaskSensitiveString(s);
        }

        if (value.GetType().IsPrimitive || value is decimal || value is DateTime || value is Guid)
        {
            return value;
        }

        if (value is IDictionary dict)
        {
            var cleanDict = new Dictionary<string, object?>();
            foreach (DictionaryEntry entry in dict)
            {
                var key = entry.Key?.ToString() ?? string.Empty;
                if (IsSensitiveKey(key))
                {
                    cleanDict[key] = "[REDACTED]";
                }
                else
                {
                    cleanDict[key] = SanitizeValue(entry.Value);
                }
            }
            return cleanDict;
        }

        if (value is IEnumerable enumerable && value is not string)
        {
            var list = new List<object?>();
            foreach (var item in enumerable)
            {
                list.Add(SanitizeValue(item));
            }
            return list;
        }

        // For regular POCOs, inspect properties
        var properties = value.GetType().GetProperties();
        var pocoDict = new Dictionary<string, object?>();
        foreach (var prop in properties)
        {
            if (!prop.CanRead) continue;

            if (IsSensitiveKey(prop.Name))
            {
                pocoDict[prop.Name] = "[REDACTED]";
            }
            else
            {
                try
                {
                    var propVal = prop.GetValue(value);
                    pocoDict[prop.Name] = SanitizeValue(propVal);
                }
                catch
                {
                    pocoDict[prop.Name] = "[UNREADABLE]";
                }
            }
        }
        return pocoDict;
    }

    private static bool IsSensitiveKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return false;
        var cleanKey = Regex.Replace(key, @"[_\-\s]", "");
        return SensitiveKeyPatterns.Any(p => cleanKey.Contains(p, StringComparison.OrdinalIgnoreCase));
    }

    private static string MaskSensitiveString(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input;

        var result = JwtRegex.Replace(input, "[REDACTED_JWT]");
        result = ConnectionStringRegex.Replace(result, "$1=[REDACTED];");

        return result.Length > MaxDetailsLength ? result[..MaxDetailsLength] + "...[TRUNCATED]" : result;
    }
}

