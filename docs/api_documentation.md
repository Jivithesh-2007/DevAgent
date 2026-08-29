# API Documentation

The Flask backend provides RESTful endpoints consumed by the vanilla JavaScript frontend.

### Project Endpoints

- `GET /api/projects`: Retrieve all projects.
- `POST /api/projects`: Create a new project.
- `GET /api/projects/<id>`: Retrieve specific project details.
- `POST /api/projects/<id>/start`: Start the agentic development workflow.

### Resource Endpoints

- `GET /api/projects/<id>/tasks`: Retrieve tasks associated with a project.
- `GET /api/projects/<id>/logs`: Retrieve execution logs for a project.
- `GET /api/projects/<id>/tests`: Retrieve test results for a project.
- `GET /api/projects/<id>/files`: Retrieve generated files and their content.

### Dashboard Stats

- `GET /api/dashboard/stats`: Retrieve aggregate statistics (total projects, tests passed, etc.).
