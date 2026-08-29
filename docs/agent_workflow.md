# Agent Workflow

The core of the Autonomous Software Development Agent is its orchestrator, which sequentially triggers different AI agents to perform tasks.

## Sequence

1.  **Requirement Analysis**: Converts user input into structured JSON containing functional/technical requirements.
2.  **Planning**: Generates a task-by-task execution plan based on the requirement analysis.
3.  **Architecture Design**: Generates a project directory and file structure.
4.  **Code Generation**: Generates source code for individual files as planned in the architecture.
5.  **Testing**: Simulated execution of automated tests on the generated codebase.
6.  **Code Review**: Analyzes the generated code for quality, security, and maintainability.
7.  **Verification**: Final check to ensure all original requirements have been satisfied.
8.  **Documentation**: Generates the final `README.md` for the project.

This workflow dynamically utilizes outputs from previous steps as context for the next steps.
