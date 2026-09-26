using System.Text.RegularExpressions;
using Xunit;

namespace ReservationServiceTests;

// Repository guards: the CD workflow must keep asserting the Blob settings the application reads, must reference the
// storage secret by NAME only, and must never contain a secret value. These tests only read files in the repository.
public sealed class DeploymentConfigurationTests
{
    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, ".github", "workflows", "cd.yml")))
        {
            dir = dir.Parent;
        }

        Assert.NotNull(dir);
        return dir!.FullName;
    }

    private static string Cd() => File.ReadAllText(Path.Combine(RepoRoot(), ".github", "workflows", "cd.yml"));

    private static string Service() =>
        File.ReadAllText(Path.Combine(RepoRoot(), "backend", "reservation-service", "Services", "ImageStorageService.cs"));

    // The text of one workflow step: from "- name: <name>" up to the next step.
    private static string Step(string cd, string nameStartsWith)
    {
        var match = Regex.Match(cd, @"- name: " + Regex.Escape(nameStartsWith) + @"[^\n]*\n(?<body>.*?)(?=\n      - name: |\z)", RegexOptions.Singleline);
        Assert.True(match.Success, $"workflow step '{nameStartsWith}' not found");
        return match.Value;
    }

    [Fact]
    public void ReservationDeploy_AssertsTheBlobSettings_InTheSameUpdateAsTheImage()
    {
        var step = Step(Cd(), "Deploy Reservation Service");

        Assert.Contains("--image \"$ACR_LOGIN_SERVER/reservation-service:${{ github.sha }}\"", step);
        Assert.Contains("--set-env-vars", step);
        Assert.Contains("\"AZURE_STORAGE_CONNECTION_STRING=secretref:$BLOB_SECRET_NAME\"", step);
        Assert.Contains("\"Storage__BlobContainerName=$BLOB_CONTAINER_NAME\"", step);
        Assert.Contains("\"ASPNETCORE_ENVIRONMENT=Production\"", step);
    }

    [Fact]
    public void Workflow_ReferencesTheSecretByNameOnly_NeverAValue()
    {
        var cd = Cd();

        Assert.Matches(@"BLOB_SECRET_NAME: storage-connection-string\r?\n", cd);
        Assert.Matches(@"BLOB_CONTAINER_NAME: menu-images\r?\n", cd);
        Assert.DoesNotMatch(@"AccountKey|DefaultEndpointsProtocol|SharedAccessSignature|EndpointSuffix|[?&]sig=", cd);
        Assert.DoesNotContain("--show-values", cd);
        Assert.DoesNotContain("--replace-env-vars", cd);   // would wipe every other variable
        Assert.DoesNotMatch(@"AZURE_STORAGE_CONNECTION_STRING=(?!secretref:)", cd);
    }

    [Fact]
    public void Workflow_VerifiesTheTemplate_WithoutEverEchoingAValue()
    {
        var verify = Step(Cd(), "Verify Reservation Service configuration");

        Assert.Contains("secretRef", verify);
        Assert.Contains("value not shown", verify);
        // The plain-text value may be tested ([ -n "$plain" ]) but must never be interpolated into a message.
        Assert.DoesNotMatch(@"(echo|::error::|::warning::)[^\n]*\$\{?plain", verify);
    }

    [Fact]
    public void WorkflowVariableNames_MatchTheKeysTheApplicationReads()
    {
        var service = Service();
        var cd = Cd();

        // Environment variable "A__B" is configuration key "A:B"; a bare name is used as is.
        Assert.Contains("\"AZURE_STORAGE_CONNECTION_STRING\"", service);
        Assert.Contains("AZURE_STORAGE_CONNECTION_STRING=secretref:", cd);

        Assert.Contains("\"Storage:BlobContainerName\"", service);
        Assert.Contains("Storage__BlobContainerName=", cd);
    }

    [Fact]
    public void OtherServices_AreStillDeployedByImageOnly()
    {
        var cd = Cd();
        Assert.DoesNotContain("--set-env-vars", Step(cd, "Deploy Identity Service"));
        Assert.DoesNotContain("--set-env-vars", Step(cd, "Deploy Frontend"));
    }
}
