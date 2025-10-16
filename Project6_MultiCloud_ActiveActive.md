# Project 6 — Multi‑Cloud Active‑Active (AWS + Azure)

Implementation guide for an active‑active serverless deployment spanning AWS and Azure. It contains architecture, implementation steps, Terraform examples, CI/CD pipeline skeleton, sample app code, sample data and an operational runbook you can hand in as project deliverables.

---

## Executive summary
Design and implement an active‑active serverless application deployed to both AWS and Azure. Traffic is distributed by global DNS and a CDN/edge layer. Data is replicated or synchronized between clouds using event‑driven messaging to achieve eventual consistency. CI/CD deploys to both clouds in parallel; monitoring and runbooks ensure quick detection and failover.

---

## Scope & assumptions
- Two cloud accounts: AWS (with ability to create IAM roles, Route53, Lambda, DynamoDB, S3) and Azure (subscription with permissions to create Function Apps, Traffic Manager/Front Door, Cosmos DB, Storage Account).
- Used Terraform for IaC and GitHub Actions for CI/CD (adjust to Azure DevOps / Jenkins if required).
- Example app: a simple HTTP API (serverless) that returns region/instance metadata and writes simple objects to the datastore.
- RPO: eventual consistency; RTO: immediate traffic shift via DNS/traffic manager.

---

## Architecture (diagram)

```mermaid
flowchart LR
  subgraph Edge[Global Edge]
    C[Cloudflare / CDN / WAF]
    DNS[(Global DNS: Route53 / Traffic Manager)]
  end

  C --> DNS
  DNS --> AWS_API[API Gateway (AWS)]
  DNS --> AZ_API[Azure Front Door / APIM]

  AWS_API --> AWS_FUNC[AWS Lambda]
  AZ_API --> AZ_FUNC[Azure Function]

  AWS_FUNC --> AWS_DB[DynamoDB / S3]
  AZ_FUNC --> AZ_DB[Cosmos DB / Blob Storage]

  AWS_FUNC ---|events| CROSS[Cross‑cloud bridge (SQS ⇄ Service Bus)]
  AZ_FUNC ---|events| CROSS

  AWS_FUNC --> OBS(CloudWatch → Centralized logging)
  AZ_FUNC --> OBS(Azure Monitor → Centralized logging)
```

---

## Components and decisions (short)
- Global entry: Cloudflare or CDN in front for WAF + caching.
- DNS: Route53 weighted/latency + Azure Traffic Manager / Front Door (or Cloudflare Load Balancer) for active‑active routing.
- Compute: AWS Lambda and Azure Functions (same runtime/language).
- Data: Option A — eventually consistent stores (DynamoDB + Cosmos DB with event sync). Option B — single primary + read only secondary (if strict consistency required).
- Messaging: SQS + Azure Service Bus or topics + small bridge consumers for cross‑cloud replication.
- Observability: Datadog / Elastic / Splunk or forwarding CloudWatch & Azure Logs to a central system.
- Secrets: Vault or provider native (AWS Secrets Manager + Azure Key Vault) with limited sync.

---

## Step‑by‑step implementation (detailed)

### Phase 0 — Planning & repo
1. Create a GitHub repo `multicloud-project` with directories `terraform/`, `app/`, `ci/`, `docs/`.
2. Create Terraform workspaces for `aws` and `azure` or separate state backends (S3 + DynamoDB for locking on AWS; Azure Storage account for Azure state). Use remote state to avoid local drift.
3. Define the API contract and tests (OpenAPI / contract tests placed into `app/tests`).

**Deliverables:** repo skeleton, OpenAPI spec `openapi.yaml`.

---

### Phase 1 — Tooling & accounts
1. Ensure you have:
   - AWS CLI configured (`aws configure`) and appropriate IAM user/role.
   - Azure CLI installed and logged in (`az login`).
   - Terraform v1.5+ installed.
   - Node.js / Python runtime for the sample app.
2. Create service principals and IAM roles for CI (GitHub OIDC recommended):
   - In AWS, create IAM OIDC provider and role that GitHub can assume. Minimal permissions for deploying TF/CDK.
   - In Azure, create an app registration + service principal with Contributor on target resource groups or use OIDC.

**Notes:** Use least privilege.

---

### Phase 2 — Networking & security foundations
1. AWS: create a VPC, public/private subnets (if you need non‑serverless components), security groups, and NAT if required. For Lambda, ensure VPC access if you need DB connectivity.
2. Azure: create virtual network and subnets, NSGs mirroring AWS security policy.
3. Centralize network CIDR documentation in `docs/network.md`.

Terraform pattern: create `modules/network/aws` and `modules/network/azure`.

---

### Phase 3 — Serverless endpoints & storage
**AWS (Terraform module)**
- Create module `modules/aws_lambda` to provision:
  - IAM role for Lambda (execution + logging)
  - Lambda function (packaged ZIP or container image)
  - API Gateway REST or HTTP API
  - DynamoDB table + S3 bucket for artifacts

**Azure (Terraform module)**
- `modules/azure_function` to provision:
  - Resource Group, Storage Account
  - App Service plan (or Consumption for function)
  - Function App (zip deploy or container)
  - Cosmos DB (Core API) and Blob Storage

Sample minimal Terraform snippets are included in the appendix of this document (see `terraform/examples`).

---

### Phase 4 — Cross‑cloud replication & messaging
1. For each write operation, publish an event to a local queue/topic (SQS or SNS; Azure Service Bus / Event Grid).
2. Deploy a tiny bridge consumer in each cloud that subscribes to the local queue and republishes to the other cloud (idempotent writes). This can be a Lambda / Function with minimal permissions.
3. Use a message format with `event_id`, `source_region`, `op_type`, `payload`, and `timestamp`.



---

### Phase 5 — Global DNS & CDN
1. Use Cloudflare or CloudFront + WAF for global edge and DDoS protection.
2. Configure Route53 (or Cloudflare Load Balancer) with weighted or latency records pointing at AWS and Azure endpoints. Alternatively use Azure Front Door's global load balancing together with Route53.
3. Add health checks for both endpoints so automated failover is possible.

**Route53 weighted example:**
- `api.example.com` A/ALIAS -> `{aws-endpoint}` weight 50
- `api.example.com` A/ALIAS -> `{azure-endpoint}` weight 50
- Health checks monitor `/health` on both API endpoints.

---

### Phase 6 — CI/CD (GitHub Actions example)
1. CI builds artifacts (zip or container image) once.
2. Two parallel deploy jobs: deploy to AWS and deploy to Azure.
3. Use GitHub OIDC to authenticate to cloud providers and avoid storing long‑lived secrets.



---

### Phase 7 — Observability & monitoring
1. Health probes at API edge; automatic DNS failover uses these probes.
2. Centralized logging: forward CloudWatch Logs and Azure Monitor logs to Datadog/ELK via a connector.
3. Instrument functions with traces and metrics; create alerts for error rate, latency, and cross‑cloud replication lag.

---

### Phase 8 — Security & secrets
1. Keep secrets in provider‑native vaults: AWS Secrets Manager + Azure Key Vault. CI uses short‑lived tokens via OIDC.
2. Use IAM roles and Managed Identities where possible, follow least privilege.
3. Encrypt at rest and in transit. Audit log all changes.

---

### Phase 9 — Testing & DR drills
1. Contract tests — run against both endpoints.
2. Smoke tests — ensure a simple create/read flow works on both clouds.
3. Chaos test — disable AWS endpoint and validate traffic shifts and complete flows on Azure.
4. DR drill runbook (see Runbook section).

---

**If AWS endpoint fails health checks:**
1. Traffic is automatically routed to Azure by DNS/Traffic Manager.
2. Run health checks and check CloudWatch logs.
3. Reprocess any pending events from SQS via replay to Azure stores.
4. Investigate root cause and restore AWS service.

**If Azure endpoint fails:**
- Symmetric steps — route to AWS, replay Service Bus messages to DynamoDB, investigate.

**If cross‑cloud replication lags:**
- Inspect message queue length, consumer errors, replay dead‑lettered messages.



## Deliverables checklist
- [ ] Full architecture diagram (Mermaid + PNG)
- [ ] Terraform modules for AWS and Azure
- [ ] Sample app code (serverless) + packaging scripts
- [ ] GitHub Actions pipeline YAML
- [ ] Runbook + DR test logs
- [ ] README with deployment steps and how to run local tests

---

*End of document.*
