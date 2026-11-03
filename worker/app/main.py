import logging
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.dataset import AnalyzeRequest
from app.services.processor import process_dataset, cancel_dataset

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Feedback Analysis Worker")

# Allow CORS for the Express API to talk to this worker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-worker"}

@app.post("/analyze")
def start_analysis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    logging.info(f"Received analysis request for dataset_id: {request.dataset_id}")
    
    # Trigger background task and return immediately
    background_tasks.add_task(process_dataset, request.dataset_id)
    
    return {
        "status": "processing",
        "message": f"Dataset {request.dataset_id} analysis started in the background."
    }

@app.post("/cancel")
def cancel_analysis(request: AnalyzeRequest):
    logging.info(f"Received cancel request for dataset_id: {request.dataset_id}")
    cancel_dataset(request.dataset_id)
    return {
        "status": "cancelled",
        "message": f"Dataset {request.dataset_id} analysis cancellation requested."
    }
