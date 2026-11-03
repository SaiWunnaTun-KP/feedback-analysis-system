import logging
from app.database import SessionLocal
from app.services.analyzer import analyze_text
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)

# Active cancellation registry for running dataset tasks
cancelled_datasets: set[int] = set()

def cancel_dataset(dataset_id: int):
    """Signals an ongoing dataset processing task to stop immediately."""
    logging.info(f"Cancellation requested for dataset_id: {dataset_id}")
    cancelled_datasets.add(dataset_id)

def process_dataset(dataset_id: int):
    logging.info(f"Starting processing for dataset_id: {dataset_id}")
    cancelled_datasets.discard(dataset_id)
    
    try:
        # Phase 1: Set status to ANALYSIS_IN_PROGRESS, clear error_message, fetch reviews
        with SessionLocal() as db:
            if dataset_id in cancelled_datasets:
                logging.info(f"Dataset {dataset_id} cancelled before start. Aborting.")
                cancelled_datasets.discard(dataset_id)
                return

            db.execute(
                text("UPDATE datasets SET status = 'ANALYSIS_IN_PROGRESS', error_message = NULL, processed_reviews = 0, updated_at = NOW() WHERE id = :dataset_id"),
                {"dataset_id": dataset_id}
            )
            db.commit()

            result = db.execute(
                text("SELECT id, review_text FROM reviews WHERE dataset_id = :dataset_id"),
                {"dataset_id": dataset_id}
            )
            reviews = result.fetchall()
            
            if not reviews:
                logging.warning(f"No reviews found for dataset_id: {dataset_id}")
                db.execute(
                    text("UPDATE datasets SET status = 'COMPLETED', total_reviews = 0, processed_reviews = 0, error_message = NULL, updated_at = NOW() WHERE id = :dataset_id"),
                    {"dataset_id": dataset_id}
                )
                db.commit()
                return

            total_count = len(reviews)
            db.execute(
                text("UPDATE datasets SET total_reviews = :total_count, updated_at = NOW() WHERE id = :dataset_id"),
                {"total_count": total_count, "dataset_id": dataset_id}
            )
            db.commit()

        logging.info(f"Found {len(reviews)} reviews for dataset {dataset_id}. Starting NLP analysis in memory...")

        # Phase 2: Analyze in memory with progress tracking and cancellation checks
        results_to_insert = []
        total_reviews = len(reviews)
        update_interval = max(10, min(50, total_reviews // 20))

        for idx, review in enumerate(reviews):
            # Check if user requested cancellation during processing
            if dataset_id in cancelled_datasets:
                logging.info(f"Analysis cancelled for dataset {dataset_id} at review {idx + 1}. Aborting immediately.")
                cancelled_datasets.discard(dataset_id)
                return

            review_id = review[0]
            text_content = review[1]
            
            aspects_sentiments = analyze_text(text_content)
            
            for item in aspects_sentiments:
                results_to_insert.append({
                    "review_id": review_id,
                    "aspect": item["aspect"],
                    "opinion": item["opinion"],
                    "sentiment": item["sentiment"]
                })
                
            processed_count = idx + 1
            if processed_count % update_interval == 0 or processed_count == total_reviews:
                try:
                    with SessionLocal() as db:
                        # Check if dataset was deleted from DB while running
                        ds_check = db.execute(
                            text("SELECT id FROM datasets WHERE id = :dataset_id"),
                            {"dataset_id": dataset_id}
                        ).fetchone()
                        
                        if not ds_check or dataset_id in cancelled_datasets:
                            logging.info(f"Dataset {dataset_id} no longer exists or was cancelled. Aborting worker.")
                            cancelled_datasets.discard(dataset_id)
                            return

                        db.execute(
                            text("UPDATE datasets SET processed_reviews = :processed_count, updated_at = NOW() WHERE id = :dataset_id"),
                            {"processed_count": processed_count, "dataset_id": dataset_id}
                        )
                        db.commit()
                except Exception as prog_err:
                    logging.warning(f"Failed to update progress tick for dataset {dataset_id}: {prog_err}")
                logging.info(f"Analyzed {processed_count} / {total_reviews} reviews...")

        # Phase 3: Batch insert into DB
        if dataset_id in cancelled_datasets:
            logging.info(f"Dataset {dataset_id} cancelled before DB insert. Aborting.")
            cancelled_datasets.discard(dataset_id)
            return

        if results_to_insert:
            logging.info(f"Preparing to insert {len(results_to_insert)} results...")
            chunk_size = 2000
            
            with SessionLocal() as db:
                for i in range(0, len(results_to_insert), chunk_size):
                    if dataset_id in cancelled_datasets:
                        logging.info(f"Dataset {dataset_id} cancelled during DB insert. Aborting.")
                        cancelled_datasets.discard(dataset_id)
                        return

                    chunk = results_to_insert[i:i+chunk_size]
                    values_sql = []
                    params = {}
                    for idx, item in enumerate(chunk):
                        aspect_val = str(item["aspect"])[:255]
                        opinion_val = str(item["opinion"])
                        sentiment_val = str(item["sentiment"])[:50]
                        
                        values_sql.append(f"(:r_{idx}, :a_{idx}, :o_{idx}, :s_{idx})")
                        params[f"r_{idx}"] = item["review_id"]
                        params[f"a_{idx}"] = aspect_val
                        params[f"o_{idx}"] = opinion_val
                        params[f"s_{idx}"] = sentiment_val
                        
                    query = f"INSERT INTO feedback_results (review_id, aspect, opinion, sentiment) VALUES {', '.join(values_sql)}"
                    db.execute(text(query), params)
                    db.commit()
                    logging.info(f"Inserted chunk {i} to {i + len(chunk)}...")

        # Phase 4: Update final dataset status to COMPLETED (if not cancelled or deleted)
        if dataset_id in cancelled_datasets:
            logging.info(f"Dataset {dataset_id} cancelled before completion. Skipping status update.")
            cancelled_datasets.discard(dataset_id)
            return

        with SessionLocal() as db:
            ds_check = db.execute(
                text("SELECT id FROM datasets WHERE id = :dataset_id"),
                {"dataset_id": dataset_id}
            ).fetchone()
            
            if not ds_check:
                logging.info(f"Dataset {dataset_id} was deleted before completion. Skipping status update.")
                return

            db.execute(
                text("UPDATE datasets SET status = 'COMPLETED', processed_reviews = total_reviews, error_message = NULL, updated_at = NOW() WHERE id = :dataset_id"),
                {"dataset_id": dataset_id}
            )
            db.commit()
            logging.info(f"Successfully completed dataset_id: {dataset_id}")

    except Exception as e:
        if dataset_id in cancelled_datasets:
            logging.info(f"Exception ignored for cancelled dataset {dataset_id}: {e}")
            cancelled_datasets.discard(dataset_id)
            return

        logging.exception(f"Error processing dataset_id {dataset_id}: {e}")
        try:
            with SessionLocal() as db:
                ds_check = db.execute(
                    text("SELECT id FROM datasets WHERE id = :dataset_id"),
                    {"dataset_id": dataset_id}
                ).fetchone()
                
                if not ds_check:
                    return

                error_msg = str(e)[:900]
                db.execute(
                    text("UPDATE datasets SET status = 'FAILED', error_message = :err, updated_at = NOW() WHERE id = :dataset_id"),
                    {"dataset_id": dataset_id, "err": error_msg}
                )
                db.commit()
                logging.info(f"Recorded FAILED status for dataset_id {dataset_id}: {error_msg}")
        except Exception as db_err:
            logging.exception(f"Could not update FAILED status in DB for dataset {dataset_id}: {db_err}")
