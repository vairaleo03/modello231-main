import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/upload-audio.module.css";
import { FaCheckCircle } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { withAuthPage } from "../utils/auth";

export const getServerSideProps = withAuthPage(async (ctx, userId) => {
  return { props: {} };
});

const UploadPage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [audioFileId, setAudioFileId] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [progress, setProgress] = useState(null);
  const router = useRouter();
  
  useEffect(() => {
    const socketDomain = process.env.NEXT_PUBLIC_BE?.replace(/^https?:\/\//, ""); // rimuove http:// o https://
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  
    if (!socketDomain) {
      console.warn("⚠️ Variabile NEXT_PUBLIC_BE non definita.");
      return;
    }
  
    const socket = new WebSocket(`${protocol}://${socketDomain}/ws/notifications`);
  
    socket.onopen = () => {
      console.log("✅ Connessione WebSocket stabilita.");
    };
  
    socket.onmessage = (event) => {
      console.log("📨 Messaggio dal WebSocket:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          setNotifications((prev) => [...prev, data.message]);
          setTimeout(() => {
            setNotifications((prev) =>
              prev.filter((msg) => msg !== data.message)
            );
          }, 5000);
        } else if (data.type === "progress") {
          setProgress(data.message);
        }
      } catch (error) {
        console.error("⚠️ Errore nel parsing del messaggio WebSocket:", error);
      }
    };
  
    socket.onerror = (error) => {
      console.error("❌ Errore WebSocket:", error);
    };
  
    socket.onclose = () => {
      console.log("🔌 Connessione WebSocket chiusa.");
    };
  
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log("🔒 Chiudo WebSocket...");
        socket.close();
      }
    };
  }, []);
  

  // Gestisce il caricamento automatico del file audio
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioFileId(null); // resetta l'id per sicurezza
      setAudioPreview(URL.createObjectURL(file));
      setProgress("Salvataggio audio...");
      await handleUpload(file); // Avvia l'upload
    }
  };
  
  const handleUpload = async (file) => {
    if (!file) {
      alert("Seleziona un file audio prima di caricare.");
      return;
    }
  
    const formData = new FormData();
    formData.append("audio_file", file);
  
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BE}/audio/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
  
      if (response.ok) {
        const data = await response.json();
        setAudioFileId(data.audio_file_id);
        setProgress(null); // nasconde il messaggio dopo il salvataggio
      } else {
        alert("Errore durante il caricamento del file.");
        setProgress(null);
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore di rete durante il caricamento del file.");
      setProgress(null);
    }
  };
  

  // Invia una richiesta al backend per avviare la trascrizione
  const handleStartTranscription = async () => {
    if (!audioFileId) {
      alert("ID del file audio non trovato.");
      return;
    }
  
    setIsTranscribing(true);
  
    // Avvia subito la chiamata API (non aspetta)
    const fetchPromise = fetch(
      `${process.env.NEXT_PUBLIC_BE}/start-transcription/${audioFileId}`,
      {
        method: "POST",
      }
    );
  
    // Mostra i messaggi mentre l'API lavora
    setProgress("Converto il formato per un’ottima compatibilità...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  
    setProgress("Divido l’audio in segmenti...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  
    setProgress("Effettuo la trascrizione...");
  
    try {
      const response = await fetchPromise;
  
      if (response.ok) {
        const data = await response.json();
        setProgress("Reindirizzo alla pagina editor...");
  
        setTimeout(() => {
          router.push(`/transcription-editor?transcript_id=${data.transcript_id}`);
        }, 2500);
      } else {
        const errorData = await response.json();
        console.error("Errore backend: ", errorData.detail);
        alert(`Errore durante l'avvio della trascrizione: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore di rete durante l'avvio della trascrizione.");
      setIsTranscribing(false);
    }
  };
  

  return (
    <>
      {notifications.map((message, index) => (
        <div key={index} className={styles.notification}>
          <FaCheckCircle className={styles.successIcon} /> {message}
        </div>
      ))}
      <div className={styles.modalContainer}>
        {!audioPreview && (
          <div className={styles.uploadContainer}>
            <h1 className={styles.uploadTitle}>Carica un file audio</h1>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className={styles.hiddenInput}
              id="fileInput"
            />
            <label htmlFor="fileInput" className={styles.uploadButton}>
                Seleziona
            </label>
          </div>
        )}

        {audioPreview && (
          <div className={styles.modalPreview}>
            <h2>{audioFile?.name}</h2>
            <audio controls>
              <source src={audioPreview} type="audio/mpeg" />
              Il tuo browser non supporta l&apos;elemento audio.
            </audio>
            <div className={styles.buttons}>
              <button
                className={`${styles.button} ${(!audioFileId || isTranscribing) ? styles.disabled : ""}`}
                onClick={handleStartTranscription}
                disabled={isTranscribing || !audioFileId}
              >
                {isTranscribing ? "Trascrizione in corso..." : "Avvia Trascrizione"}
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={() => setAudioPreview(null)}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}

        {/* Banner di progresso */}
        {progress !== null && (
          <div className={styles.progressModal}>
            <AiOutlineLoading3Quarters className={styles.spinner} /> {progress}
          </div>
        )}


      </div>
    </>
  );
};

export default UploadPage;
