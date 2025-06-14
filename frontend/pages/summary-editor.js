import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import HardBreak from "@tiptap/extension-hard-break";
import "prosemirror-view/style/prosemirror.css";
import styles from "../styles/transcription-editor.module.css";
import { FaCheckCircle } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import Toolbar from "../components/Editor-toolbar";
import Modal from "react-modal";
import modalStyles from "../styles/modal.module.css";
import { withAuthPage } from "../utils/auth";

export const getServerSideProps = withAuthPage(async (ctx, userId) => {
  return { props: {} };
});


const SummaryEditor = () => {
  const router = useRouter();
  const { summary_id } = router.query;
  const [content, setContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [progress, setProgress] = useState(null);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [formData, setFormData] = useState({
    VERIFICA: "ordinaria",
    NUMERO_VERBALE: 1,
    LUOGO_RIUNIONE: "Call Conference",
    DATA_RIUNIONE: new Date().toISOString().split("T")[0],
    ORARIO_INIZIO: "17:00",
    ORARIO_FINE: "18:00",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDownload = async () => {
    await saveSummary(content); // ✅ Salva la trascrizione prima di eseguire l'azione
    setTimeout(async () => {
        try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BE}/summary/${summary_id}/word`,
            {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
            }
        );
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `verbale_${summary_id}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setShowDownloadModal(false);
        }
        } catch (err) {
        console.error("Errore nel download del riassunto Word", err);
        }
    }, 1000);
  };

  useEffect(() => {
    Modal.setAppElement("#__next"); // o '#root' in base al tuo wrapper
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
      StarterKit.configure({
        hardBreak: true,
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
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
      const timeout = setTimeout(() => saveSummary(newContent), 4000);
      setDebounceTimeout(timeout);
  };

  const saveSummary = async (summary) => {
      if (!summary_id) return;
      try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BE}/summary/${summary_id}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ summary_text: summary }),
          });
          if (response.ok) {
              console.log('Trascrizione aggiornata correttamente');
          } else {
              console.error('Errore durante il salvataggio della trascrizione');
          }
      } catch (error) {
          console.error('Errore di rete: ', error);
      }
  };

  useEffect(() => {
    const fetchSummary = async () => {
      if (!summary_id) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BE}/summary/${summary_id}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.summary_text) {
            // const htmlFormatted = data.summary_text
            //   .split("\n")
            //   .map((line) => line.trim())
            //   .filter((line) => line !== "")
            //   .map((line) => {
            //     if (line.endsWith(":")) return `<h3>${line}</h3>`;
            //     if (line.startsWith("- "))
            //       return `<p style="margin-left: 20px;">• ${line.slice(2)}</p>`;
            //     return `<p>${line}</p>`;
            //   })
            //   .join("");

            editor?.commands.setContent(data.summary_text);
            setContent(data.summary_text); // 🔹 Ora `content` ha sempre un valore
          }
        } else {
          console.error("Errore nel recupero del riassunto");
        }
      } catch (error) {
        console.error("Errore di rete: ", error);
      }
    };
    if (isMounted) {
      fetchSummary();
    }
  }, [summary_id, editor, isMounted]);

  if (!isMounted) return null;

  return (
    <>
      {notifications.map((message, index) => (
        <div key={index} className={styles.notification}>
          <FaCheckCircle className={styles.successIcon} /> {message}
        </div>
      ))}
      <div className={styles.editorWrapper}>
        {/* <h1 className={styles.editorTitle}>Editor Verbale</h1> */}

        <div className={styles.toolbarWrapper}>
        <Toolbar editor={editor} />
        <button
            onClick={() => setShowDownloadModal(true)}
            className={styles.saveButton}
          >
            Scarica verbale
          </button>
            
        
        </div>
        <div className={styles.editorBox}>
          <EditorContent editor={editor} />
        </div>
        <div className={styles.buttonsContainer}>
          <button
            onClick={() => setShowDownloadModal(true)}
            className={styles.saveButton}
          >
            Scarica verbale
          </button>

          <Modal
            isOpen={showDownloadModal}
            onRequestClose={() => setShowDownloadModal(false)}
            contentLabel="Compila dati verbale"
            className={modalStyles.modalContent}
            overlayClassName={modalStyles.modalOverlay}
          >
            <h2 className={modalStyles.title}>Impostazioni</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDownload();
              }}
              className={modalStyles.form}
            >
              <div className={modalStyles.formGroup}>
                <label>Verifica</label>
                <select
                  name="VERIFICA"
                  value={formData.VERIFICA}
                  onChange={handleChange}
                  className={modalStyles.input}
                >
                  <option value="ordinaria">Ordinaria</option>
                  <option value="straordinaria">Straordinaria</option>
                </select>
              </div>

              <div className={modalStyles.formGroup}>
                <label>Numero Verbale</label>
                <input
                  type="number"
                  name="NUMERO_VERBALE"
                  value={formData.NUMERO_VERBALE}
                  onChange={handleChange}
                  className={modalStyles.input}
                />
              </div>

              <div className={modalStyles.formGroup}>
                <label>Luogo Riunione</label>
                <input
                  type="text"
                  name="LUOGO_RIUNIONE"
                  value={formData.LUOGO_RIUNIONE}
                  onChange={handleChange}
                  className={modalStyles.input}
                />
              </div>

              <div className={modalStyles.formGroup}>
                <label>Data Riunione</label>
                <input
                  type="date"
                  name="DATA_RIUNIONE"
                  value={formData.DATA_RIUNIONE}
                  onChange={handleChange}
                  className={modalStyles.input}
                />
              </div>

              <div className={modalStyles.flexRow}>
                <div className={modalStyles.formGroup}>
                  <label>Orario Inizio</label>
                  <input
                    type="time"
                    name="ORARIO_INIZIO"
                    value={formData.ORARIO_INIZIO}
                    onChange={handleChange}
                    className={modalStyles.input}
                  />
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Orario Fine</label>
                  <input
                    type="time"
                    name="ORARIO_FINE"
                    value={formData.ORARIO_FINE}
                    onChange={handleChange}
                    className={modalStyles.input}
                  />
                </div>
              </div>

              <div className={modalStyles.actionsCenter}>
                <button type="submit" className={modalStyles.submitButton}>
                  Scarica
                </button>
              </div>
            </form>
          </Modal>

          <button className={styles.saveButton}>Salva in OneDrive</button>
        </div>
      </div>
    </>
  );
};

export default SummaryEditor;
