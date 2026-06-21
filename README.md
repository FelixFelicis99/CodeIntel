CodeIntel is a full-stack web application that analyzes any code snippet using Google's Gemini AI and returns a visual architecture diagram, bug report, time complexity analysis, and an optimized diff — all in one clean IDE-style interface.

Features:

1) Architecture Diagram — Generates a Mermaid.js flowchart of the code's logical structure
2) Bug Detection — Lists bugs, logic errors, security issues, and performance suggestions
3) Complexity Analysis — Returns Big-O time complexity with explanation
4) Optimized Diff — Side-by-side diff of original vs. AI-refined code, powered by a custom LCS diff engine

Tech Stack:

1) frontend - React 18, Vite, Tailwind CSS
2) backend - FastAPI (Python), Uvicorn
3) AI - Google Gemini 2.5 Flash
4) diagram rendering - Mermaid.js (CDN, on-demand)
