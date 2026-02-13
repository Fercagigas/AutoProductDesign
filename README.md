# AutoProductDesign - Agent System

This project uses a multi-agent system orchestrated by LangGraph to design and document software projects in ultra-high detail.

## Features
- **Orchestrator**: Aligns with your vision.
- **Debate Team**: 3 Personas (Architect, PM, QA) debate implementation details.
- **Human-in-the-Loop**: pauses every 3 debate iterations for your feedback.
- **Scribe**: Generates detailed markdown documentation after 9 iterations.
- **Cost-Effective**: Configured to use free models via OpenRouter.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configuration**:
    -   Copy `.env.example` to `.env`
    -   Get your free API key from [OpenRouter](https://openrouter.ai/)
    -   Set `OPENROUTER_API_KEY` in `.env`

3.  **Run**:
    ```bash
    python main.py
    ```
    Or simply double-click `run_app.bat`.

## Usage
1.  Describe your project when prompted.
2.  Answer the Orchestrator's questions until the vision is confirmed.
3.  Watch the agents debate.
4.  Provide feedback when the system pauses (every 3 iterations).
5.  Find your documentation in the `output/` folder.
