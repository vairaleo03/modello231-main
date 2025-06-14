import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import "prosemirror-view/style/prosemirror.css";
import styles from "../styles/transcription-editor.module.css";
import { FaCheckCircle } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import Toolbar from "../components/Editor-toolbar";
import { withAuthPage } from "../utils/auth";

export const getServerSideProps = withAuthPage(async (ctx, userId) => {
  return { props: {} };
});

const TranscriptionEditor = () => {
  const router = useRouter();
  const { transcript_id } = router.query;
  const [content, setContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [progress, setProgress] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const socketDomain = process.env.NEXT_PUBLIC_BE?.replace(/^https?:\/\//, ""); // rimuove http:// o https://
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${socketDomain}/ws/notifications`);
    ws.onopen = () => {
      console.log("WebSocket connesso per aggiornamenti di salvataggio");
    };
    ws.onmessage = (event) => {
      console.log("Messaggio dal WebSocket:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        setNotifications((prev) => [...prev, data.message]);
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((msg) => msg !== data.message)
          );
        }, 2500);
      } else if (data.type === "progress") {
        setProgress(data.message);
      }
    };
    ws.onerror = (error) => {
      console.error("Errore WebSocket:", error);
    };
    ws.onclose = () => {
      console.log("Connessione WebSocket chiusa.");
    };
    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Chiudendo WebSocket...");
        ws.close();
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      // TextStyle,
      // TextAlign.configure({ types: ["heading", "paragraph"] }),
      // Color.configure({ types: ["textStyle"] }),
      // Highlight.configure({ multicolor: true }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      handleDebouncedSave(newContent);
    },
    editorProps: {
      attributes: {
        class: `${styles.editorContainer}`,
        style: "white-space: pre-wrap;",
      },
    },
    injectCSS: false,
    editable: true,
    immediatelyRender: false,
  });

  const handleDebouncedSave = (newContent) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    const timeout = setTimeout(() => saveTranscription(newContent), 4000);
    setDebounceTimeout(timeout);
  };

  const saveTranscription = async (text) => {
    if (!transcript_id) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BE}/transcriptions/${transcript_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript_text: text }),
        }
      );
      if (response.ok) {
        console.log("Trascrizione aggiornata correttamente");
      } else {
        console.error(
          "Errore durante il salvataggio della trascrizione",
          errorText
        );
      }
    } catch (error) {
      console.error("Errore di rete: ", error);
    }
  };

  const handleWordAction = async (action) => {
    if (!transcript_id) {
      console.error("Nessuna trascrizione selezionata");
      return;
    }

    console.log("Salvando la trascrizione prima di eseguire l'azione...");
    await saveTranscription(content); //Salva la trascrizione prima di eseguire l'azione

    setTimeout(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BE}/transcriptions/${transcript_id}/word?action=${action}`,
          { method: "POST" }
        );

        if (action === "download" && response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `trascrizione_${transcript_id}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log("Download completato");
        } else if (action === "upload" && response.ok) {
          console.log("File caricato su OneDrive con successo");
        } else {
          console.error("Errore durante l'operazione:", response.statusText);
        }
      } catch (error) {
        console.error("Errore di rete:", error);
      }
    }, 1000);
  };

  const startSummary = async (action) => {
    if (!transcript_id) {
      console.error("Nessuna trascrizione selezionata");
      return;
    }

    setIsSummarizing(true); // 🔹 Disabilita il bottone
    setProgress("Riassumo la trascrizione..."); // 🔹 Mostra messaggio

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BE}/summary/start/${transcript_id}`,
        { method: "POST" }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("risposta --> ", data);
        router.push(`/summary-editor?summary_id=${data}`);
      }
    } catch (e) {
      console.error("Errore: ", e);
    } finally {
      setIsSummarizing(false); // opzionale se vuoi riattivare dopo
      setProgress(null); // nasconde il messaggio (opzionale, se il redirect è veloce)
    }
  };

  useEffect(() => {
    const fetchTranscription = async () => {
      if (!transcript_id) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BE}/transcriptions/${transcript_id}`
        );
        if (response.ok) {
          const data = await response.json();

          if (data.transcript_text) {
            editor?.commands.setContent(data.transcript_text);
            setContent(data.transcript_text); // 🔹 Ora `content` ha sempre un valore
          }
        } else {
          console.error("Errore nel recupero della trascrizione");
        }
      } catch (error) {
        console.error("Errore di rete: ", error);
      }
    };
    if (isMounted) {
      fetchTranscription();
    }
  }, [transcript_id, editor, isMounted]);

  if (!isMounted) return null;

  return (
    <>
      {notifications.map((message, index) => (
        <div key={index} className={styles.notification}>
          <FaCheckCircle className={styles.successIcon} /> {message}
        </div>
      ))}
      <div className={styles.editorWrapper}>
        {/* <h1 className={styles.editorTitle}>Editor di Trascrizione</h1> */}
        <div className={styles.toolbarWrapper}>
        <Toolbar editor={editor} />
            <button
                onClick={() => startSummary()}
                className={`${styles.saveButton} ${
                isSummarizing ? styles.disabled : ""
                }`}
                disabled={isSummarizing}
            >
                {isSummarizing ? "Verbalizzazione in corso..." : "Verbalizza"}
            </button>
            
        
        </div>
        <div className={styles.editorBox}>
          <EditorContent editor={editor} />
        </div>
        <div className={styles.buttonsContainer}>
          {/* <button className={styles.saveButton} onClick={saveTranscription}>Salva Trascrizione</button> */}
          <button
            onClick={() => handleWordAction("download")}
            className={styles.saveButton}
          >
            Scarica documento
          </button>
          <button
            onClick={() => startSummary()}
            className={`${styles.saveButton} ${
              isSummarizing ? styles.disabled : ""
            }`}
            disabled={isSummarizing}
          >
            {isSummarizing ? "Verbalizzazione in corso..." : "Verbalizza"}
          </button>
          <button className={styles.saveButton}>Salva in OneDrive</button>
        </div>

        {/* Banner di progresso */}
        {/* {progress !== null && (
          <div className={styles.progressModal}>
            <AiOutlineLoading3Quarters className={styles.spinner} /> {progress}
          </div>
        )} */}

      </div>
    </>
  );
};

export default TranscriptionEditor;
