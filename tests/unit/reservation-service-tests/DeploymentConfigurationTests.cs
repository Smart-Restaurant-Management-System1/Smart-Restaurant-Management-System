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

    [Fact]
    public void Workflow_ConfiguresPayHereEnvironmentVariables_UsingHierarchicalDoubleUnderscores()
    {
        var step = Step(Cd(), "Deploy Reservation Service");

        // Hierarchy PayHere:<Property> must use PayHere__<Property> for ASP.NET Core environment variable mapping
        Assert.Contains("PayHere__MerchantId", step);
        Assert.Contains("PayHere__IsSandbox", step);
        Assert.Contains("PayHere__MerchantSecret", step);
        Assert.Contains("PayHere__AzureMerchantSecret", step);
        Assert.Contains("PayHere__LocalMerchantSecret", step);

        // URL vars must also be deployed explicitly to prevent stale Azure Portal values persisting (SR-280)
        Assert.Contains("PayHere__AzureNotifyUrl", step);
        Assert.Contains("PayHere__AzureReturnUrl", step);
        Assert.Contains("PayHere__AzureCancelUrl", step);

        // Never bind with legacy flat variables
        Assert.DoesNotContain("PAYHERE_MERCHANT_SECRET=", step);
        Assert.DoesNotContain("PAYHERE_AZURE_MERCHANT_SECRET=", step);
    }

    [Fact]
    public void Workflow_AzureNotifyUrl_UsesFrontendWebDomain_NotReservationApiDomain()
    {
        var step = Step(Cd(), "Deploy Reservation Service");

        // The notify_url MUST use the frontend-web domain (the PayHere registered Sandbox app domain).
        // The nginx proxy at frontend-web forwards /reservation-api/api/* to reservation-api:5000/api/*.
        // Sending reservation-api.* domain to PayHere causes "Unauthorized payment request" (SR-280).
        Assert.Contains(
            "frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify",
            step);
        Assert.DoesNotContain(
            "reservation-api.purpledesert-2900c071.eastasia.azurecontainerapps.io/api/payments/payhere/notify",
            step);
    }

    [Fact]
    public void Workflow_VerifyStep_ChecksPayHereAzureNotifyUrl()
    {
        var verify = Step(Cd(), "Verify Reservation Service configuration");

        Assert.Contains("PayHere__AzureNotifyUrl", verify);
        Assert.Contains("frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify", verify);
    }

    [Fact]
    public void Workflow_PayHereSecrets_FallBackToRegisteredFrontendAppSecret()
    {
        var step = Step(Cd(), "Deploy Reservation Service");

        // Safe fallback must use the registered frontend app secret (MzQ1...)
        Assert.Contains("DEFAULT_PAYHERE_SECRET=\"MzQ1MTU2MDU1MzM1MjQzMDA5MTQxNjQwMzE4ODIxNzU2NDE0MTI=\"", step);
        // Stale wrong secret (NDIw...) must be recognized and overridden
        Assert.Contains("OLD_WRONG_SECRET=\"NDIwMTkxMjE5NzI3MDcwOTkwNDUzMDM0Mzc2OTg1MjIxMTI4MzM1MQ==\"", step);
        Assert.Contains("PayHere__AzureMerchantSecret=$EFFECTIVE_AZURE_SECRET", step);
    }

    [Fact]
    public void Workflow_VerifyStep_ChecksPayHereAzureMerchantSecret()
    {
        var verify = Step(Cd(), "Verify Reservation Service configuration");

        Assert.Contains("PayHere__AzureMerchantSecret is set to registered frontend app secret", verify);
        Assert.Contains("MzQ1MTU2MDU1MzM1MjQzMDA5MTQxNjQwMzE4ODIxNzU2NDE0MTI=", verify);
    }
}
