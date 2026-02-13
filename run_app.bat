@echo off
echo Starting AutoProductDesign...
if not exist .env (
    echo WARNING: .env file not found. Please copy .env.example to .env and set your API key.
    pause
    exit /b
)
python main.py
pause
