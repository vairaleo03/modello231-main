import React, { useState } from "react";
import { FaArrowLeft, FaUpload, FaFileAlt, FaTimes, FaRobot } from "react-icons/fa";
import styles from "../styles/admin-forms.module.css";

const AdminClientForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    ragioneSociale: "",
    partitaIva: "",
    codiceFiscale: "",
    telefono: "",
    email: "",
    pec: "",
    indirizzo: "",
    citta: "",
    cap: "",
    provincia: "",
    rappresentanteLegale: "",
    cfRappresentante: "",
    settoreAttivita: "",
    numeroDipendenti: "",
    note: ""
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResults, setExtractionResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const extractDataFromDocuments = async () => {
    if (uploadedFiles.length === 0) {
      alert("Carica almeno un documento per estrarre i dati");
      return;
    }

    setIsExtracting(true);
    
    // Simulazione dell'estrazione dati (mock)
    setTimeout(() => {
      const mockExtractedData = {
        ragioneSociale: "AZIENDA ESEMPIO S.R.L.",
        partitaIva: "12345678901",
        codiceFiscale: "12345678901",
        telefono: "080-1234567",
        email: "info@aziendaesempio.it",
        pec: "azienda@pec.it",
        indirizzo: "Via Roma, 123",
        citta: "Bari",
        cap: "70100",
        provincia: "BA",
        rappresentanteLegale: "Mario Rossi",
        cfRappresentante: "RSSMRA80A01F205X"
      };

      setExtractionResults(mockExtractedData);
      setIsExtracting(false);
    }, 3000);
  };

  const applyExtractedData = () => {
    if (extractionResults) {
      setFormData(prev => ({
        ...prev,
        ...extractionResults
      }));
      setExtractionResults(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulazione salvataggio (mock API call)
    setTimeout(() => {
      alert("Cliente creato con successo!");
      setIsSubmitting(false);
      onBack();
    }, 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <button onClick={onBack} className={styles.backButton}>
          <FaArrowLeft /> Indietro
        </button>
      </div>

      {/* Sezione Upload Documenti */}
      <div className={styles.documentSection}>
        <h3>Carica Documenti</h3>
        <p>Carica documenti aziendali per estrarre automaticamente le informazioni</p>
        
        <div className={styles.uploadArea}>
          <input
            type="file"
            id="fileUpload"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className={styles.hiddenInput}
          />
          <label htmlFor="fileUpload" className={styles.uploadButton}>
            <FaUpload /> Seleziona Documenti
          </label>
        </div>

        {uploadedFiles.length > 0 && (
          <div className={styles.fileList}>
            <h4>Documenti Caricati:</h4>
            {uploadedFiles.map(file => (
              <div key={file.id} className={styles.fileItem}>
                <FaFileAlt className={styles.fileIcon} />
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className={styles.removeFile}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            
            <button
              onClick={extractDataFromDocuments}
              className={styles.extractButton}
              disabled={isExtracting}
            >
              <FaRobot />
              {isExtracting ? "Estrazione in corso..." : "Estrai Dati Automaticamente"}
            </button>
          </div>
        )}

        {extractionResults && (
          <div className={styles.extractionResults}>
            <h4>Dati Estratti:</h4>
            <div className={styles.extractedData}>
              <p><strong>Ragione Sociale:</strong> {extractionResults.ragioneSociale}</p>
              <p><strong>P.IVA:</strong> {extractionResults.partitaIva}</p>
              <p><strong>Rappresentante Legale:</strong> {extractionResults.rappresentanteLegale}</p>
              <p><strong>Indirizzo:</strong> {extractionResults.indirizzo}, {extractionResults.citta}</p>
            </div>
            <button onClick={applyExtractedData} className={styles.applyButton}>
              Applica Dati Estratti
            </button>
          </div>
        )}
      </div>

      {/* Form Principale */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h3>Informazioni Aziendali</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Ragione Sociale *</label>
              <input
                type="text"
                name="ragioneSociale"
                value={formData.ragioneSociale}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Partita IVA *</label>
              <input
                type="text"
                name="partitaIva"
                value={formData.partitaIva}
                onChange={handleInputChange}
                required
                pattern="[0-9]{11}"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Codice Fiscale</label>
              <input
                type="text"
                name="codiceFiscale"
                value={formData.codiceFiscale}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Settore di Attività</label>
              <select
                name="settoreAttivita"
                value={formData.settoreAttivita}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="">Seleziona settore</option>
                <option value="manifatturiero">Manifatturiero</option>
                <option value="servizi">Servizi</option>
                <option value="commercio">Commercio</option>
                <option value="costruzioni">Costruzioni</option>
                <option value="trasporti">Trasporti</option>
                <option value="sanitario">Sanitario</option>
                <option value="altro">Altro</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Numero Dipendenti</label>
              <input
                type="number"
                name="numeroDipendenti"
                value={formData.numeroDipendenti}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Contatti</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Telefono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>PEC</label>
              <input
                type="email"
                name="pec"
                value={formData.pec}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Indirizzo</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Indirizzo *</label>
              <input
                type="text"
                name="indirizzo"
                value={formData.indirizzo}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Città *</label>
              <input
                type="text"
                name="citta"
                value={formData.citta}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>CAP</label>
              <input
                type="text"
                name="cap"
                value={formData.cap}
                onChange={handleInputChange}
                pattern="[0-9]{5}"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Provincia</label>
              <input
                type="text"
                name="provincia"
                value={formData.provincia}
                onChange={handleInputChange}
                maxLength="2"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Rappresentante Legale</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Nome e Cognome *</label>
              <input
                type="text"
                name="rappresentanteLegale"
                value={formData.rappresentanteLegale}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Codice Fiscale Rappresentante</label>
              <input
                type="text"
                name="cfRappresentante"
                value={formData.cfRappresentante}
                onChange={handleInputChange}
                pattern="[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Note Aggiuntive</h3>
          <div className={styles.formGroup}>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows="4"
              className={styles.textarea}
              placeholder="Eventuali note o informazioni aggiuntive..."
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onBack}
            className={styles.cancelButton}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? "Creazione in corso..." : "Crea Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminClientForm;