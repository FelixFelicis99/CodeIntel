import os
import re
import time
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CodeIntel Analytical API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("GEMINI_API_KEY", "")

client = genai.Client(
    api_key=API_KEY,
    http_options={'api_version': 'v1beta'}
)

class CodeAnalysisSchema(BaseModel):
    architecture: str = Field(description="A clean, valid Mermaid.js 'graph TD' diagram tracking logical code flow. Do not use complex layout structures.")
    bugs: List[str] = Field(description="List of bugs, logic errors, security issues, or performance suggestions.")
    complexity: str = Field(description="The Time Complexity of the code written in Big-O notation, e.g., O(n), O(log n), O(1).")
    refinedCode: str = Field(description="The optimized, cleaner, and commented version of the inputted code.")

class CodeRequest(BaseModel):
    code: str


def sanitize_mermaid(diagram: str) -> str:
    lines = diagram.split("\n")
    cleaned_lines = []

    for line in lines:
        def clean_label(match):
            opening = match.group(1)
            label = match.group(2)
            closing = match.group(3)
            label = re.sub(r'[\[\]{}"\'&<>|]', '', label)
            label = re.sub(r'\s*=\s*', ' equals ', label)
            label = re.sub(r'!=', 'not equals', label)
            label = label.strip()
            return f"{opening}{label}{closing}"

        # Match outermost [ ... ] or { ... } greedily up to the LAST bracket on the line
        line = re.sub(r'(\[|\{)(.+)(\]|\})(?=[^\[\]{}]*$)', clean_label, line)
        cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def call_gemini_with_retry(code: str, max_retries: int = 3):
    last_error = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"Please analyze the following codebase:\n\n{code}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CodeAnalysisSchema,
                    system_instruction=(
                        "You are an expert compiler engineer and software architect. "
                        "Analyze the given code and strictly populate the requested schema. "
                        "For the 'architecture' flowchart, use basic Mermaid.js diagram format starting with 'graph TD'. "
                        "Node labels must be plain English descriptions only — do not include code syntax, "
                        "brackets, parentheses, quotes, ampersands, or special characters inside node labels. "
                        "Keep labels short, e.g., A[Function Name] --> B[Loop]."
                    ),
                    temperature=0.2,
                )
            )
            return response
        except Exception as e:
            last_error = e
            err_str = str(e)
            # Retry only on transient errors (503 unavailable, overloaded, rate limit)
            if "503" in err_str or "UNAVAILABLE" in err_str or "overloaded" in err_str.lower():
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 1  # 1s, 2s, 4s
                    print(f"--- Gemini 503/overloaded, retrying in {wait_time}s (attempt {attempt+1}/{max_retries}) ---")
                    time.sleep(wait_time)
                    continue
            # Non-retryable error or out of retries
            raise last_error
    raise last_error


@app.post("/analyze", response_model=CodeAnalysisSchema)
async def analyze_code(request: CodeRequest):
    OFFLINE_DEV_MODE = False

    if OFFLINE_DEV_MODE or not API_KEY:
        print("--- OFFLINE MOCK MODE ACTIVE ---")
        return {
            "architecture": "graph TD\n    A[Start Evaluation] --> B[Read Source Code]\n    B --> C[Offline Static Review]\n    C --> D[Visual Output Rendered]",
            "bugs": [
                "Dev-Warning: Running in OFFLINE mock mode.",
                "Verify your GEMINI_API_KEY inside your D:\\projects\\codeintel\\backend\\.env file to activate real AI analysis."
            ],
            "complexity": "O(1) - Offline Preview",
            "refinedCode": f"// Optimized version of your code:\n{request.code}\n\n// Toggle OFFLINE_DEV_MODE to False inside main.py to run real AI analysis."
        }

    try:
        response = call_gemini_with_retry(request.code)
        result = CodeAnalysisSchema.model_validate_json(response.text)

        # Sanitize the Mermaid diagram before sending to frontend
        result.architecture = sanitize_mermaid(result.architecture)
        
        result = CodeAnalysisSchema.model_validate_json(response.text)
        print("ARCHITECTURE OUTPUT:", repr(result.architecture))
        result.architecture = sanitize_mermaid(result.architecture)
        print("SANITIZED:", repr(result.architecture))

        return result

    except Exception as e:
        print(f"!!! API ERROR ENCOUNTERED: {e}")
        return {
            "architecture": "graph TD\n    Err[API Error] --> Q[Check Quota Limit]\n    Q --> E[Confirm Billing and Key]",
            "bugs": [
                f"Gemini API Error: {str(e)}",
                "Ensure your new API Key has been correctly configured in the backend/.env file."
            ],
            "complexity": "Error Status",
            "refinedCode": request.code
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

