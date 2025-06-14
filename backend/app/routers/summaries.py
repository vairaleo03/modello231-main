from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import update
from app.database import get_db
from app.models.verbs import Verbs
from pydantic import BaseModel
from app.routers.websocket_manager import websocket_manager;
from app.models.transcripts import Transcript
from app.services.summarizer import generate_summary
from app.utils.post_processing import parse_odv_summary, fill_odv_template, parse_to_tiptap_json, estrai_sezioni_verbale
from datetime import datetime

router = APIRouter()

class SummaryUpdateRequest(BaseModel):
    summary_text: str

class VerbaleFields(BaseModel):
    VERIFICA: str
    NUMERO_VERBALE: int
    LUOGO_RIUNIONE: str
    DATA_RIUNIONE: str
    ORARIO_INIZIO: str
    ORARIO_FINE: str

# API che genera il riassunto della trascrizione
@router.post("/summary/start/{transcript_id}")
def summarize_transcription(transcript_id: int, db: Session = Depends(get_db)):
    try: 
        result = db.execute(select(Transcript).filter(Transcript.id == transcript_id))
        transcript = result.scalar_one_or_none()

        if not transcript:
            print(f"Trascrizione con ID {transcript_id} non trovata nel database.")
            raise HTTPException(status_code=404, detail="Trascrizione non trovata")

        if not transcript.transcript_text:
            raise HTTPException(status_code=400, detail="Testo della trascrizione mancante")

        summary = generate_summary(transcript.transcript_text)
                
        try:

            new_verbs = Verbs(
            transcript_id=transcript_id,
            verbs_text=summary,
            created_at=datetime.utcnow()
            )

            db.add(new_verbs)
            db.commit()
            db.refresh(new_verbs)
        except Exception as e:
            print(f"❌ Errore durante il processo: {e}")

        return new_verbs.id
    
    except Exception as e:
        print(f"❌ Eccezione nell'endpoint summary/start/ : {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante il riassunto: {str(e)}")


# API che recupera un riassunto
@router.get("/summary/{summary_id}")
def get_summary(summary_id: int, db: Session = Depends(get_db)):
    result = db.execute(select(Verbs).filter(Verbs.id == summary_id))
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail="Riassunto non trovato")

    summary_parsed = parse_to_tiptap_json(summary.verbs_text)
    return {
        "summary_id": summary.id,
        "transcript_id": summary.transcript_id,
        "summary_text": summary_parsed,
        "created_at": summary.created_at
    }

# API che Salva automaticamente le modifiche al riassunto
@router.put("/summary/{summary_id}")
def update_transcription(summary_id: int, request: SummaryUpdateRequest, db: Session = Depends(get_db)):
    result = db.execute(select(Verbs).filter(Verbs.id == summary_id))
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail="Riassunto non trovato")

    stmt = update(Verbs).where(Verbs.id == summary_id).values(verbs_text=request.summary_text)
    db.execute(stmt)
    db.commit()
    websocket_manager.send_notification("Modifiche salvate")
    return {"message": "Riassunto aggiornato con successo!"}


# download di un riassunto come docx, in modo semplice, solo testo
@router.post("/summary/{summary_id}/word")
def download_summary_word(summary_id: int, fields: VerbaleFields, db: Session = Depends(get_db)):
    # Recupero riassunto dal DB
    result = db.execute(select(Verbs).filter_by(id=summary_id))
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail="Riassunto non trovato")
    
    sections = estrai_sezioni_verbale(summary.verbs_text)

    print(f"sections -----> {sections}")

    extra_fields = {
        "DATA_RIUNIONE": datetime.strptime(fields.DATA_RIUNIONE, "%Y-%m-%d").strftime("%d/%m/%Y"),
        "ORARIO_INIZIO": fields.ORARIO_INIZIO,
        "ORARIO_FINE": fields.ORARIO_FINE,
        "LUOGO_RIUNIONE": fields.LUOGO_RIUNIONE,
        "DATA_REDAZIONE": datetime.utcnow().strftime("%d/%m/%Y"),
        "NUMERO_VERBALE": str(fields.NUMERO_VERBALE),
        "VERIFICA": fields.VERIFICA
    }

    filename = f"verbale_odv_{summary_id}.docx"
    filepath = f"/tmp/{filename}"
    fill_odv_template(sections, filepath, extra_fields)

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )