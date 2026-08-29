# Autonomous Software Development Agent

*An Agentic AI-Based System for Automated Software Planning, Code Generation, Testing, Debugging and Verification.*

This project implements a complete developer dashboard and an orchestrator for AI agents to automatically build software projects based on natural language requirements.

## Architecture & Technology Stack

- **Backend**: Python 3, Flask, SQLite, SQLAlchemy
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No React/Angular/Vue)
- **AI Integration**: Google Gemini API via `google-genai` SDK

## Features

- **Agentic Workflow**: Includes Requirement, Planning, Architecture, Coding, Testing, Debugging, Code Review, Verification, and Documentation Agents.
- **Professional Dashboard**: A clean, technical user interface inspired by tools like GitHub, GitLab, and CI/CD dashboards.
- **Project Workspace**: Safely isolates generated code in separate directories.
- **Real-time Monitoring**: Track task execution, logs, and generated files as the AI works.

## Installation & Setup

1. **Clone the repository.**
2. **Set up the virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables:**
   Ensure you have a `.env` file (or set it in your environment) with your Gemini API key:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```
4. **Run the Application:**
   ```bash
   python app.py
   ```
5. **Access the Dashboard:**
   Open a web browser and navigate to `http://127.0.0.1:5000` (or `http://localhost:3000` in the preview environment).

## Project Documentation

Detailed documentation for different components can be found in the `docs/` directory:
- [Architecture](docs/architecture.md)
- [Agent Workflow](docs/agent_workflow.md)
- [API Documentation](docs/api_documentation.md)
- [Testing Methodology](docs/testing.md)

## Developer

Built as a college/internship project demonstrating autonomous AI software development methodologies.
