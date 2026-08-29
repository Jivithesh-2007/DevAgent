# Architecture

The system is designed with a simple and understandable architecture suitable for a college project.

## Components

1.  **Frontend**: HTML5, CSS3, Vanilla JavaScript. Served by Flask. Provides a professional developer dashboard UI.
2.  **Backend (Flask)**: Handles HTTP requests, manages the SQLite database, and provides API endpoints for the frontend.
3.  **Database (SQLite)**: Stores projects, tasks, logs, and test results.
4.  **AI Service (`ai_service.py`)**: Centralizes all interactions with the Google Gemini API.
5.  **Orchestrator (`orchestrator.py`)**: Manages the step-by-step execution of the autonomous agents.

## Project Workspace

Generated code is stored safely in `generated_projects/project_<ID>/` to ensure isolation from the main application files.
