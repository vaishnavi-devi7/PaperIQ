# PaperIQ

AI-powered research paper analysis platform.

## Features
- Upload and extract PDFs
- Ask AI questions about uploaded papers
- Research quality scoring
- Keyword and summary extraction
- Multi-document comparison
- History and analytics view

## Tech Stack
- Frontend: Next.js, TypeScript
- Backend: FastAPI, Python
- AI: Hugging Face
- Database: SQLite

## Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

### Frontend
cd frontend
npm install
npm run dev

###Environment Variables 
Create backend/.env:
HF_API_KEY=your_key_here

### Future Improvements
- better ai streaming 
-advanced research gap detection 
-live deployment 

**5. Test the project once**
Run backend:
```bash
cd ~/Desktop/paperiq/backend
source venv/bin/activate
uvicorn app.main:app --reload
### run frontend in another terminal 
