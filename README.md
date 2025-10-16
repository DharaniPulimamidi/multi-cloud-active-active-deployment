Project 6 — Multi‑Cloud Active‑Active (AWS + Azure)
-------------------------------------------------

Contents (in this ZIP):
- Project6_MultiCloud_ActiveActive.md  (full project document)
- architecture_diagram.png (visual diagram)
- users_50k.csv  (synthetic dataset, 50,000 rows)
- code/ (sample app, terraform snippets, CI YAML)
- code.zip (convenience ZIP containing code/ folder)

Quick start:
1. Inspect the project document for design and implementation steps: Project6_MultiCloud_ActiveActive.md
2. Review the architecture diagram in architecture_diagram.png
3. Browse sample code under code/
4. Use the dataset users_50k.csv for load/ingestion testing. For local tests, reduce row count as desired.
5. Deploy using Terraform by filling in provider credentials and variables in code/terraform/*

Notes:
- The Terraform files are minimal examples — customize and harden before running in production.
- The sample app is intentionally small and intended for demonstration and testing.
- If you want a larger dataset (e.g., 200k or 1M rows) or a different schema (product orders, logs), tell me and I will generate it.
