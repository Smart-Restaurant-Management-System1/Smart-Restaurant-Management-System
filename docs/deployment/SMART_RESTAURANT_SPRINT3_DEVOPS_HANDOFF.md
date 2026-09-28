# Smart Restaurant Management System — DevOps Handoff and Operating Guide

> **Audience:** VS Code AI coding agent, DevOps engineer, project maintainer, and QA engineer  
> **Environment:** Development environment on Microsoft Azure  
> **Repository:** `https://github.com/Smart-Restaurant-Management-System1/Smart-Restaurant-Management-System.git`  
> **Primary integration branch:** `develop`  
> **Production branch:** `main` — do not merge into it until the complete system is approved  
> **Last verified date:** 2026-09-28 (Asia/Colombo)

---

## 1. Purpose

This document is the authoritative DevOps handoff for the Sprint 3 recovery, integration, deployment, and validation work performed for the Cinnamon Bistro Smart Restaurant Management System.

An AI agent using this document must:

1. Inspect the live repository and Azure state before making assumptions.
2. Preserve unrelated user changes.
3. Use feature/fix branches and pull requests targeting `develop`.
4. Never push directly to `develop` or `main`.
5. Never use or push to the mistaken personal fork.
6. Never expose credentials, tokens, database passwords, connection strings, JWTs, cookies, or storage keys.
7. Separate diagnosis, implementation, deployment, and production verification.
8. Report confirmed evidence separately from inference.

---

## 2. Repository and Local Workspace

### 2.1 Canonical repository

```text
https://github.com/Smart-Restaurant-Management-System1/Smart-Restaurant-Management-System.git
```

The following personal fork was created by mistake and must not be used:

```text
https://github.com/PraveenSanjaya/Smart-Restaurant-Management-System.git
```

### 2.2 Canonical Windows project path

```text
C:\Users\Praveen\OneDrive\Documents\3YS1_LabsProjects\CSP_Labs\Smart_Restaurant-Management_System
```

### 2.3 Git worktrees used during recovery

```text
C:\Users\Praveen\sr-worktrees\blob-upload-fix
C:\Users\Praveen\sr-worktrees\order-cart-403
C:\Users\Praveen\sr-worktrees\nginx-upload
```

These directories are legitimate Git worktrees connected to the canonical repository. They are not separate projects. Do not delete them with File Explorer while Git still tracks them.

### 2.4 Important local-change rule

The canonical project tree previously contained unrelated user-owned changes in:

- `.gitignore`
- Identity service application settings
- Reservation service application settings

Before any work, run:

```powershell
git status --short
git worktree list
git remote -v
```

Never discard, reset, overwrite, stage, or commit unrelated changes.

---

## 3. Authentication and Identity Requirements

GitHub operations must run as:

```text
PraveenSanjaya
```

Verify before a push or pull request:

```powershell
gh auth status
gh api user --jq .login
git remote get-url --push origin
```

Expected repository:

```text
https://github.com/Smart-Restaurant-Management-System1/Smart-Restaurant-Management-System.git
```

If the active account is `it24101848`, stop. That account previously had read-only access and caused HTTP 403 push failures.

Do not:

- Print a GitHub token.
- Read tokens from credential storage.
- Change accounts automatically.
- Clear Windows Credential Manager without explicit approval.
- Push through a personal fork.

---

## 4. Git Branching and Pull Request Policy

### 4.1 Required flow

```text
fix-or-feature-branch -> pull request -> develop -> CI/CD -> Azure development environment
```

### 4.2 Prohibited flow

```text
local branch -> direct push to develop
local branch -> direct push to main
develop -> main before full-system approval
feature branch -> personal fork
force push
```

### 4.3 Standard branch preparation

```powershell
git fetch origin develop
git rev-list --left-right --count origin/develop...HEAD
git status --short
git diff --check
```

Interpret the ahead/behind result:

- `0 1`: branch is one commit ahead of current `develop`.
- `0 0`: branch matches `develop`.
- A nonzero left value: branch is behind and must be updated safely.

If uncommitted work exists on an outdated branch:

```powershell
git stash push --include-untracked --message "wip: preserve work before updating develop"
git merge --ff-only origin/develop
git stash pop
```

Stop if `git stash pop` reports conflicts.

### 4.4 Staging policy

Stage explicit reviewed paths:

```powershell
git add -- path\one path\two
git diff --cached --name-status
git diff --cached --stat
git diff --cached --check
```

Avoid `git add -A` when unrelated files may exist.

### 4.5 Pull request requirements

Every PR must include:

- Summary
- Jira/user-story reference
- Exact changes
- Tests performed
- Security/secret statement
- Deployment scope
- Rollback considerations
- Manual production verification steps

Confirm before merge:

- Base is `develop`.
- Head is the intended branch.
- Changed files are only the reviewed files.
- Required checks pass.
- No conflicts exist.
- No secret-scanning alert exists.

---

## 5. System Architecture

### 5.1 Application components

| Component | Technology | Azure resource |
|---|---|---|
| Frontend | React + Vite + nginx | Container App `frontend-web` |
| Identity API | ASP.NET Core Web API (.NET 8) | Container App `identity-api` |
| Reservation/Menu/Order/Kitchen API | ASP.NET Core Web API (.NET 8) | Container App `reservation-api` |
| Database | Azure Database for MySQL Flexible Server 8.4 | `mysql-cinnamon-bistro-dev` |
| Container images | Azure Container Registry | `acrcinnamonbistrodev` |
| Blob storage | Azure Storage V2 | `stcinnamonbistrodev1848` |
| Blob container | Public blob read | `menu-images` |
| Container environment | Azure Container Apps Environment | `cae-cinnamon-bistro-dev` |
| Logs | Log Analytics | Resource in `rg-cinnamon-bistro-dev` |

### 5.2 Resource group

```text
rg-cinnamon-bistro-dev
```

### 5.3 Deployed frontend

```text
https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io
```

### 5.4 API routing through frontend nginx

The browser uses same-origin paths:

- `/api/auth/...` for Identity
- `/reservation-api/...` for Reservation/Menu/Order/Kitchen

The frontend nginx container proxies those requests to the respective Azure Container Apps.

---

## 6. Azure Safety Rules

Before any Azure write:

1. Confirm the account and subscription.
2. Confirm the target resource group.
3. Run a read-only `show`, `list`, or `what-if` command where available.
4. Never print secret values.
5. Change one resource at a time.
6. Verify health after the change.
7. Record rollback instructions.

Recommended preflight:

```bash
az account show --output table
az group show --name rg-cinnamon-bistro-dev --output table
az resource list --resource-group rg-cinnamon-bistro-dev --output table
```

Cloud Shell uses Bash. Do not paste PowerShell backticks or PowerShell cmdlets into Cloud Shell.

PowerShell line continuation:

```text
`
```

Bash line continuation:

```text
\
```

---

## 7. Database Recovery and Sprint 3 Schema

### 7.1 Database

```text
restaurant_reservation_db
```

### 7.2 Required tables verified

1. `RestaurantTables`
2. `Reservations`
3. `ReservationOutbox`
4. `MenuItems`
5. `OrderCarts`
6. `OrderCartItems`
7. `DineInOrders`
8. `DineInOrderItems`
9. `ReservationPreOrders`
10. `ReservationPreOrderItems`

### 7.3 Migration files used

- `03_menu_items.sql`
- `07_order_cart.sql`
- `08_dine_in_orders.sql`
- `09_reservation_pre_orders.sql`
- `10_order_lifecycle_events.sql`

### 7.4 Verified state

- All 10 required tables exist.
- Menu, cart, dine-in order, and reservation pre-order constraints were verified.
- Required foreign keys and check constraints were verified.
- Reservation outbox indexes were verified.
- Existing reservation, table, and outbox data remained intact.
- Sprint 3 order/menu tables were initially empty as expected.

### 7.5 Authentication lesson

MySQL `ERROR 1045` means authentication was rejected. It is not a firewall propagation error. The correct password was eventually verified using Azure Cloud Shell.

Do not repeatedly retry `1045`. Stop and correct the saved login path or password.

### 7.6 Backup lesson

The preflight script initially expected three `CREATE TABLE` statements, but the live schema already contained eight tables. This was a stale expectation, not database corruption.

Never restore or delete a database because a backup-verification count differs from an outdated script assumption. Inspect the actual schema first.

---

## 8. Azure Blob Storage for Menu Images

### 8.1 Storage configuration

| Setting | Value |
|---|---|
| Account | `stcinnamonbistrodev1848` |
| Container | `menu-images` |
| SKU | Standard_LRS |
| Kind | StorageV2 |
| HTTPS only | Enabled |
| Minimum TLS | TLS 1.2 |
| Blob public access | Enabled |
| Container public access | Blob |

### 8.2 CORS

Blob CORS permits the deployed frontend origin for:

- GET
- HEAD
- OPTIONS

### 8.3 Reservation API environment

Expected variables:

```text
AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection-string
Storage__BlobContainerName=menu-images
```

Never print the connection string. Only report whether it is set, absent, empty, or blank.

### 8.4 Correct image URL format

```text
https://stcinnamonbistrodev1848.blob.core.windows.net/menu-images/dish_<generated-id>.<extension>
```

Opening only:

```text
https://stcinnamonbistrodev1848.blob.core.windows.net/menu-images/
```

may return `ResourceNotFound` because Blob Storage does not provide a directory index. That does not mean individual blobs are unavailable.

### 8.5 Blob application fix

PR #55 introduced production-safe behavior:

- Production requires working Azure Blob Storage.
- Blob upload returns an absolute HTTPS URL.
- Blank configuration values no longer shadow valid alternatives.
- Blob failures return a controlled `503 IMAGE_STORAGE_UNAVAILABLE`.
- Production no longer returns fake-success local `/uploads/...` paths.
- Development may retain local fallback behavior.
- Logs do not contain connection strings or storage keys.
- Existing pasted external HTTPS image URLs remain valid.
- Legacy local paths remain identifiable for manual re-upload.

PR #55:

- Merged into `develop`
- CI passed
- CD passed
- Production upload verified

### 8.6 Current menu-image state

Verified menu records use either:

- Direct Azure Blob URLs, or
- Valid external HTTPS image URLs

No current record in the captured Menu API response used a legacy `/uploads/menu-images/...` reference.

---

## 9. Nginx Upload-Size Fix

### 9.1 Root cause

The backend accepts menu photos up to 5 MB. Nginx's default request-body limit is 1 MB, so images above 1 MB previously failed before reaching the backend.

### 9.2 Fix

PR #57 added an exact-match nginx location:

```nginx
location = /reservation-api/MenuItems/upload-image {
    client_max_body_size 6m;
    # Existing proxy configuration remains here.
}
```

The 6 MB nginx limit allows:

- The backend's 5 MB file limit
- Multipart form-data overhead

All other routes keep the nginx default limit.

### 9.3 Files changed

- `frontend/restaurant-web/nginx.azure.conf`
- `frontend/restaurant-web/nginx.conf`
- `frontend/restaurant-web/src/config/nginxUploadLimit.test.js`

### 9.4 Verification

- Targeted nginx tests: 8 passed
- Full frontend tests: 147 passed
- Frontend production build: passed
- PR #57 merged into `develop`
- CI passed
- CD passed
- Files above 5 MB are rejected by client-side validation
- A permitted image was uploaded, stored with a Blob URL, saved in a menu item, and displayed

For strict evidence of the old 1 MB boundary being removed, record the successful test image's exact size and confirm it is greater than 1 MB and no more than 5 MB.

PowerShell:

```powershell
Get-Item "C:\path\to\image.jpg" |
  Select-Object Name,Length,@{
    Name="SizeMB"
    Expression={[math]::Round($_.Length / 1MB, 2)}
  }
```

---

## 10. Cart Authorization Fix

### 10.1 Root cause

The backend Order Cart controller is Customer-only by design. The frontend previously allowed Admin users to open customer-ordering pages, causing the API to return HTTP 403.

The backend authorization was correct and was not broadened.

### 10.2 Fix

PR #56:

- Makes customer ordering routes Customer-only.
- Redirects Admin and Kitchen Staff before customer-only pages mount.
- Provides friendly 401 and 403 messages.
- Makes remembered post-login redirects role-aware.
- Rejects unsafe/external redirect destinations.
- Adds frontend role, redirect, API-message, and token tests.
- Adds backend authorization-matrix tests.

### 10.3 Customer-only routes

- `/menu`
- `/orders`
- `/order-review`
- `/cart`
- `/reservation-pre-order`

### 10.4 Expected behavior

| Role | Customer ordering pages | Order Cart API |
|---|---|---|
| Customer | Allowed | Allowed |
| Admin | Redirected before page mount | Forbidden by backend |
| Kitchen Staff | Redirected before page mount | Forbidden by backend |
| Anonymous | Redirected to login | Unauthorized |

### 10.5 Verification

- Backend unit tests: 231 passed at implementation time
- Frontend tests: 139 passed at implementation time
- PR #56 merged into `develop`
- CI passed
- CD passed
- Production role-based UI was exercised

---

## 11. Kitchen and Order Lifecycle

Verified production behavior:

- Customer can create a reservation pre-order.
- Pre-order confirmation displays a stable reference.
- Customer order history displays the order.
- Kitchen queue receives reservation pre-orders.
- Admin can view Kitchen Management.
- Kitchen Staff can view Kitchen Operations.
- Live-update indicator is present.
- Pending order tickets display item, quantity, total, table, reservation, and received time.

Still capture, if not already retained:

1. Kitchen order transitions from Pending to Preparing.
2. Preparing to Ready.
3. Ready to Served, when supported by the UI.
4. Customer tracking reflects the same transition.

Do not alter real user data unnecessarily. Use clearly named test orders and record their references.

---

## 12. CI/CD

### 12.1 Workflows

- `Cinnamon Bistro CI`
- `Cinnamon Bistro CD`

CI runs for pull requests and relevant pushes. CD runs after changes reach `develop`.

### 12.2 Verified deployments

| PR | Purpose | Status |
|---|---|---|
| #55 | Require Azure Blob Storage for production menu uploads | Merged; CI/CD passed |
| #56 | Fix customer-cart authorization and redirects | Merged; CI/CD passed |
| #57 | Allow nginx menu uploads up to API limit | Merged; CI/CD passed |

### 12.3 Workflow warnings

Two non-blocking maintenance warnings were observed:

1. Some GitHub Actions versions target deprecated Node.js 20 and are temporarily forced onto Node.js 24.
2. `ubuntu-latest` will migrate to Ubuntu 26.

Treat these as separate maintenance work. Do not mix them into a functional bug-fix PR.

Recommended future work:

- Review supported versions of `actions/checkout` and `azure/login`.
- Pin or test the workflow on the intended Ubuntu runner.
- Validate Docker, .NET, Node, Azure CLI, and Container Apps steps against the new runner.

---

## 13. Production Regression Matrix

### 13.1 Customer

- [x] Login succeeds.
- [x] Customer portal loads.
- [x] Browse Menu works.
- [x] Cart and ordering flow function.
- [x] Reservation pre-order can be placed.
- [x] Confirmation reference is displayed.
- [x] Order appears in My Orders.
- [x] Item, quantity, total, type, and status appear.
- [ ] Capture the actual `order-cart` Fetch/XHR request showing HTTP 200, if not already retained.

### 13.2 Admin

- [x] Login succeeds.
- [x] Admin portal loads.
- [x] Menu Management works.
- [x] Menu creation and image display work.
- [x] Kitchen Management works.
- [x] Booking Management works.
- [x] Network filter showed no 403 requests during the captured session.
- [ ] Capture a direct attempt to open `/cart`, `/orders`, or `/order-review` and the safe redirect.

### 13.3 Kitchen Staff

- [x] Login succeeds.
- [x] Kitchen portal loads.
- [x] Kitchen queue displays active orders.
- [x] Pending reservation pre-orders appear.
- [x] Live updates indicator is visible.
- [ ] Capture Pending -> Preparing.
- [ ] Capture Preparing -> Ready.
- [ ] Capture Ready -> Served, if available.

### 13.4 Anonymous

- [x] Login page loads.
- [ ] In an Incognito window, open `/orders` and capture the redirect to `/login`.

### 13.5 Evidence privacy

Screenshots may include:

- Public URLs
- Role names
- HTTP status codes
- Non-sensitive test order references

Screenshots must not include:

- Passwords
- JWT tokens
- Authorization headers
- Cookies
- Storage keys
- Database passwords
- Connection strings
- GitHub tokens

---

## 14. Azure Health Verification

Use read-only commands first.

```bash
RG="rg-cinnamon-bistro-dev"

az containerapp show \
  --resource-group "$RG" \
  --name reservation-api \
  --query "{Image:properties.template.containers[0].image,Revision:properties.latestRevisionName,Provisioning:properties.provisioningState,Running:properties.runningStatus}" \
  --output table

az containerapp revision list \
  --resource-group "$RG" \
  --name reservation-api \
  --query "[?properties.active].{Revision:name,Health:properties.healthState,Provisioning:properties.provisioningState,Replicas:properties.replicas,Created:properties.createdTime}" \
  --output table
```

Repeat for:

- `identity-api`
- `frontend-web`

Healthy target state:

- Provisioning: Succeeded/Provisioned
- Running: Running
- Revision health: Healthy
- At least one replica when traffic is active

Do not treat contradictory metadata timestamps as proof of process age. Prefer revision state, application startup logs, and direct health checks.

---

## 15. Incident Diagnostics

### 15.1 HTTP 401

Meaning:

- No token
- Expired token
- Invalid token

Check:

- Authentication state
- Bearer header attachment
- Token expiry
- Correct API audience/issuer

### 15.2 HTTP 403

Meaning:

- Authenticated identity lacks the required role

Do not automatically broaden backend authorization. Verify the intended access matrix first.

### 15.3 HTTP 404 for `/reservation-api/uploads/...`

Meaning:

- Legacy local-disk image reference
- Frontend proxy does not serve the backend container's ephemeral filesystem

Correct fix:

- Re-upload to Azure Blob Storage
- Store absolute Blob URL

Incorrect fix:

- Pretend the local URL succeeded
- Add random proxy rules for ephemeral production files

### 15.4 HTTP 413

Meaning:

- Request body rejected before the API, usually by nginx

For the menu upload endpoint:

- nginx exact route limit: 6 MB
- API file limit: 5 MB

### 15.5 HTTP 500

Check:

- Backend logs
- Missing schema/table
- Database connectivity
- Unhandled exception
- Misconfigured environment values

Do not mask missing schema with frontend error handling.

### 15.6 HTTP 503 `IMAGE_STORAGE_UNAVAILABLE`

Meaning:

- Production Blob configuration is missing, empty, blank, or failing

Check:

- Secret reference exists
- Environment variable name is correct
- Container name is correct
- New revision/replica has the configuration
- Blob service is reachable

Do not fall back to local disk in Production.

---

## 16. Logging and Secret Handling

Acceptable logs:

- Exception type
- HTTP status
- Azure error code
- Blob container name
- Operation name
- Correlation ID

Never log:

- Connection string
- Account key
- JWT
- Password
- Cookie
- Full Authorization header
- Secret value

When checking container environment, report only:

```text
ABSENT
EMPTY
BLANK
SET
```

Never echo the value.

---

## 17. Rollback Strategy

### 17.1 Application rollback

Use the previous known-good image tag or Azure Container App revision.

Before rollback:

1. Identify the current and previous revision.
2. Confirm the exact image tags.
3. Record current traffic weights.
4. Confirm no database migration depends on the new code.

After rollback:

1. Verify Container App health.
2. Verify login.
3. Verify MenuItems.
4. Verify Kitchen queue.
5. Verify Blob images.

### 17.2 Database rollback

Do not attempt database rollback casually. MySQL DDL may auto-commit.

Before any database change:

- Create schema backup.
- Create data backup for affected tables.
- Verify backup size and contents.
- Record row counts.
- Apply one migration at a time.
- Verify immediately.

### 17.3 Blob rollback

Code rollback does not require deleting blobs. Blob URLs stored in the database remain valid.

Never delete test blobs or menu records without confirming:

- The object is test-only.
- No menu item references it.
- No order history depends on the menu record.
- Deletion is explicitly approved.

---

## 18. Cleanup Policy

Do not delete recovery artifacts until the final evidence report is accepted.

Preserve:

- Database backups
- Migration evidence
- Preflight transcripts
- PR links
- CI/CD run IDs
- Production screenshots
- Test order references

Worktrees may be removed only after:

1. Their PR is merged.
2. The remote branch is no longer needed.
3. The worktree is clean.
4. Required evidence is archived.

Safe inspection:

```powershell
git worktree list
git -C "C:\path\to\worktree" status --short
```

Safe removal from the canonical repository:

```powershell
git worktree remove "C:\path\to\worktree"
git worktree prune
```

Do not use recursive filesystem deletion as the first removal method.

---

## 19. Remaining Work

### 19.1 Required to close Sprint 3 DevOps

1. Capture Customer Cart API HTTP 200 evidence.
2. Capture Admin direct-route protection without a Cart API call.
3. Capture Kitchen order status progression.
4. Capture anonymous protected-route redirect.
5. Record exact successful image size greater than 1 MB and no more than 5 MB.
6. Produce a final regression/evidence report.
7. Record any test data created and decide whether to retain, mark unavailable, or remove it.
8. Keep `main` unchanged.

### 19.2 Deferred maintenance

- GitHub Actions Node.js runtime upgrades
- Ubuntu runner migration validation
- Frontend bundle code splitting for the >500 kB warning
- Slow Azure Blob SDK failure retry tuning
- Optional automated end-to-end role regression

---

## 20. Required AI-Agent Workflow for the Next Task

The VS Code AI agent must follow this sequence:

### Phase A — Read-only audit

1. Confirm current worktree and branch.
2. Show `git status --short`.
3. Confirm remotes.
4. Confirm active GitHub login name only.
5. Fetch `origin/develop`.
6. Compare branch with `origin/develop`.
7. Inspect relevant files and tests.
8. Report findings before editing.

### Phase B — Plan

Provide:

- Root cause
- Intended behavior
- Files to change
- Tests to add/run
- Security impact
- Deployment impact
- Rollback plan

Do not edit until the requested scope is clear.

### Phase C — Implementation

- Work only in a dedicated branch/worktree.
- Make the smallest coherent change.
- Do not modify unrelated files.
- Add regression tests.
- Avoid secrets and environment-specific credentials.
- Preserve existing authorization boundaries.

### Phase D — Validation

At minimum:

- Targeted tests
- Full affected test suite
- Production build
- `git diff --check`
- Secret-pattern scan
- Changed-file review

Where relevant:

- .NET Release build
- Backend unit tests
- Frontend tests
- Docker/compose validation
- Workflow YAML validation
- Azure read-only health checks

### Phase E — Approval gate

Before commit, report:

- Findings
- Changed paths
- Test totals
- Known warnings
- Anything not proven
- Proposed commit message

Wait for user approval if not already explicitly granted.

### Phase F — Commit and push

- Stage explicit paths.
- Verify the cached diff.
- Commit once with a focused message.
- Confirm clean status.
- Confirm GitHub identity is `PraveenSanjaya`.
- Push only the feature/fix branch to the canonical team repository.

### Phase G — Pull request

- Base: `develop`
- Head: current branch
- No auto-merge unless explicitly approved
- No `develop -> main` PR
- Wait for CI
- Report check names and conclusions

### Phase H — Deployment verification

After merge and CD:

- Verify image/revision
- Verify Container App health
- Run feature-specific production test
- Run role regression
- Capture safe evidence
- Record rollback target

---

## 21. Copy-Paste Prompt for a VS Code AI Agent

```text
You are acting as the DevOps and release-safety agent for the Cinnamon Bistro Smart Restaurant Management System.

Read SMART_RESTAURANT_DEVOPS_HANDOFF.md completely before taking any action.

Repository and safety requirements:
- Work only with https://github.com/Smart-Restaurant-Management-System1/Smart-Restaurant-Management-System.git.
- Do not use or push to the PraveenSanjaya personal fork.
- The integration branch is develop.
- Do not push directly to develop or main.
- Do not create or merge a develop-to-main PR because the full system is unfinished.
- Use a dedicated feature/fix branch and a PR into develop.
- Preserve all unrelated user changes.
- Never print or read secret values, tokens, passwords, cookies, connection strings, or storage keys.
- Do not modify Azure unless the user explicitly approves the specific mutation.

Start with a read-only audit:
1. Show the current path, branch, status, worktrees, remotes, and latest commit.
2. Confirm the active GitHub login name only.
3. Fetch origin/develop and report ahead/behind counts.
4. Inspect the files relevant to the requested task.
5. Report confirmed facts, assumptions, risks, and the smallest safe plan.

For implementation:
- Make the smallest coherent change.
- Add regression tests.
- Run targeted tests, full affected tests, production build, git diff --check, and a secret-pattern scan.
- Report any existing warnings separately from newly introduced failures.
- Before committing, provide changed paths, test totals, unproven items, rollback impact, and the proposed commit message.
- Never commit, push, open a PR, merge, or deploy unless the user has authorized that step.

For Git operations:
- Stage reviewed paths explicitly.
- Push only the current feature/fix branch to the canonical team repository.
- Open a PR into develop.
- Wait for CI and report results.

For deployment verification:
- Confirm the deployed image/revision and Container App health.
- Run the feature-specific production test.
- Do not expose request headers or credentials in screenshots.
- Keep main unchanged.

Current verified project state and remaining work are documented in SMART_RESTAURANT_DEVOPS_HANDOFF.md. Treat live repository/Azure evidence as authoritative if it has changed since the document date, and clearly explain any difference.
```

---

## 22. Definition of Done for Sprint 3 DevOps

Sprint 3 DevOps is complete when all of the following are true:

- [x] Azure MySQL is healthy.
- [x] Sprint 3 schema exists and is verified.
- [x] Menu API works.
- [x] Kitchen API works.
- [x] Reservation pre-orders work.
- [x] Customer order tracking works.
- [x] Azure Blob Storage is configured.
- [x] Production uploads return Blob URLs.
- [x] Current menu images display.
- [x] Cart authorization matches the role matrix.
- [x] Nginx supports permitted images above its old 1 MB default.
- [x] Files above 5 MB are rejected.
- [x] CI/CD passed for PRs #55, #56, and #57.
- [ ] Exact Customer Cart API 200 evidence is archived.
- [ ] Admin direct-route protection evidence is archived.
- [ ] Kitchen status-transition evidence is archived.
- [ ] Anonymous protected-route redirect evidence is archived.
- [ ] Exact successful >1 MB file-size evidence is archived.
- [ ] Final regression report is completed.
- [x] `main` remains unchanged.

---

## 23. Final Operational Principle

Prefer evidence over assumptions:

- A green workflow proves that workflow completed, not that every business journey works.
- A healthy revision proves platform health, not correct authorization.
- A successful API response proves the request worked, not that the UI persisted the correct reference.
- A displayed image proves read access, not that the upload path accepted every permitted size.
- A screenshot proves only what is visible in that screenshot.

For every production change, retain:

1. Source commit
2. Pull request
3. CI result
4. CD result
5. Azure revision/image
6. Feature-specific production evidence
7. Rollback target

