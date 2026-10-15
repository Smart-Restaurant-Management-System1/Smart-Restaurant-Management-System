# CI/CD Workflows

Create GitHub Actions workflows during Sprint 1 and keep them operational.

Recommended stages:
1. Checkout
2. Restore/install dependencies
3. Build
4. Unit tests
5. Integration tests
6. Frontend build
7. Code coverage / analysis
8. Docker build where applicable
9. Deploy to staging/production

## `cd.yml`: reservation-api menu-image storage

Every deployment of `reservation-api` sets, in the same `az containerapp update` as the new image:

| Setting | Value |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | `secretref:storage-connection-string` (a reference to a Container App secret) |
| `Storage__BlobContainerName` | `menu-images` |
| `ASPNETCORE_ENVIRONMENT` | `Production` (outside Development the API never falls back to local disk) |

* The storage connection string itself is **never** stored in this repository, in workflow YAML or in GitHub secrets.
  Create the Container App secret `storage-connection-string` once in Azure; the deploy step fails early if it is missing.
* The step after the deployment verifies the resulting template (names and references only, no values) and fails the run
  if a setting is missing or wrong.
* A correct template does not guarantee the *running* replica loaded it. The verify step therefore waits for a replica created
  after the deployment started and prints a `::warning::` if none appears. In that case stop and start the app
  (`az containerapp stop`, then `az containerapp start`) and confirm the variables inside the running container.
* Guard tests: `tests/unit/reservation-service-tests/DeploymentConfigurationTests.cs`.
