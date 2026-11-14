import logging
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import SessionLocal
from app.schemas.dataset import AnalyzeRequest
from app.services.processor import process_dataset, cancel_dataset, active_datasets

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

@app.on_event("shutdown")
def on_shutdown():
    logging.info(f"Worker shutting down. Cleaning up {len(active_datasets)} active datasets...")
    if active_datasets:
        try:
            with SessionLocal() as db:
                for ds_id in list(active_datasets):
                    logging.info(f"Setting dataset {ds_id} to FAILED due to worker shutdown.")
                    db.execute(
                        text("UPDATE datasets SET status = 'FAILED', error_message = 'Worker service was stopped during processing. Please restart the worker and click Try Again.', updated_at = NOW() WHERE id = :dataset_id AND status = 'ANALYSIS_IN_PROGRESS'"),
                        {"dataset_id": ds_id}
                    )
                db.commit()
                logging.info("Successfully marked all active datasets as FAILED on shutdown.")
        except Exception as err:
            logging.error(f"Failed to update dataset statuses on worker shutdown: {err}")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "python-worker",
        "active_datasets": list(active_datasets)
    }

@app.get("/status/{dataset_id}")
def get_dataset_status(dataset_id: int):
    return {
        "dataset_id": dataset_id,
        "is_active": dataset_id in active_datasets
    }

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
