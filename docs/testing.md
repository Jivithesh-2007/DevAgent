# Testing Methodology

This system incorporates testing at two main levels:

1.  **System Level**: The dashboard and backend API are built using standard web technologies.
2.  **Generated Code Level**: The Agentic Workflow incorporates a "Testing Agent" step.

## Simulated Execution

Due to security constraints regarding arbitrary code execution in isolated environments, the current version *simulates* the testing of generated projects.

When the Testing Agent runs:
1. It simulates checking the generated Python code.
2. It outputs simulated test results (`PASS`/`FAIL`) into the database for demonstration purposes.

In a fully local Dockerized version, this step would invoke `pytest` via `subprocess` against the generated workspace.
