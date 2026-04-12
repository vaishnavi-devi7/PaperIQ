📄 PaperIQ — AI-Powered Research Copilot

An intelligent system that helps students, researchers, and developers analyze research papers, ask context-aware questions, compare multiple papers, and detect research gaps — all in one place.

🚀 Live Problem It Solves

Research papers are:

too long ⏳
hard to understand 🤯
difficult to compare 📚
missing clear insights ❌

👉 PaperIQ solves this using AI.

✨ Key Features
📥 Smart PDF Upload & Analysis
Extracts clean text from PDFs
Auto-detects:
Title
Summary
Keywords
🧠 AI-Powered Q&A (RAG-based)
Ask questions like:
“What is the main contribution?”
“Explain methodology”
Uses:
semantic search
context retrieval
LLM-based answers
Returns:
answer + citations
📊 Advanced Document Analytics
Language quality scoring
Readability analysis
Vocabulary insights
Sentence complexity detection
🔍 Research Gap Detection (🔥 Highlight Feature)
Identifies missing elements like:
dataset issues
weak evaluation
no baseline comparison
missing future scope
📑 Multi-Paper Comparison
Compare 2–3 research papers
Shows:
summaries
scores
keywords
research gaps
shared topics
unique contributions
📈 Visual Insights
Score radar chart
Keyword frequency chart
Section completeness checklist
📄 PDF Report Generation
Download full analysis report including:
scores
summary
research gaps
suggestions
🧠 Tech Stack
Frontend
Next.js
React
Tailwind CSS
Recharts
Backend
FastAPI
Python
AI / NLP
Hugging Face Inference API
Custom NLP pipeline
Retrieval-Augmented Generation (RAG)
Database
SQLite (for chat + history)
🏗️ Architecture
User → Frontend (Next.js)
        ↓
     FastAPI Backend
        ↓
   PDF Processing + NLP
        ↓
   Vector Search (RAG)
        ↓
   HuggingFace LLM
        ↓
   Response + Insights
⚙️ Setup Instructions
1. Clone Repo
git clone https://github.com/vaishnavi-devi7/PaperIQ.git
cd PaperIQ
2. Backend Setup
cd backend
python -m venv .venv
source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt

Create .env:

HF_API_KEY=your_api_key_here

Run:

python -m uvicorn app.main:app --reload
3. Frontend Setup
cd frontend
npm install
npx next dev
4. Open App
http://localhost:3000
🎯 Hackathon Impact

Aligned with:

🌍 SDG 4 — Quality Education
🏭 SDG 9 — Innovation & Infrastructure
🏆 Why This Project Stands Out
Combines AI + NLP + Full-stack
Real-world problem solving
Includes RAG architecture
Goes beyond basic summarization
Supports multi-document reasoning
🔮 Future Improvements
AI-generated final comparison insights
Citation graph visualization
Multi-document chat
User accounts + saved dashboards
Deployment as SaaS product
👩‍💻 Author

Vaishnavi Devi
B.Tech AI & Data Science

⭐ If you like this project

Give it a ⭐ on GitHub and share!

