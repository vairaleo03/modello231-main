import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { withAuthPage } from "../utils/auth";
import AdminClientForm from "../components/AdminClientForm";
import AdminOdvForm from "../components/AdminOdvForm";
import styles from "../styles/admin-dashboard.module.css";
import { FaUsers, FaUserTie, FaPlus, FaArrowLeft } from "react-icons/fa";

export const getServerSideProps = withAuthPage(async (ctx, userId) => {
  return { props: {} };
});

const AdminDashboard = () => {
  const { user } = useUser();
  const router = useRouter();
  const [activeView, setActiveView] = useState("overview");
  
  // Controllo se l'utente è admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h1>Accesso Negato</h1>
          <p>Non hai i permessi per accedere a questa sezione.</p>
          <button onClick={() => router.push("/dashboard")} className={styles.backButton}>
            <FaArrowLeft /> Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case "new-client":
        return <AdminClientForm onBack={() => setActiveView("overview")} />;
      case "new-odv":
        return <AdminOdvForm onBack={() => setActiveView("overview")} />;
      default:
        return (
          <div className={styles.overview}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaUsers />
                </div>
                <div className={styles.statContent}>
                  <h3>Clienti Totali</h3>
                  <p className={styles.statNumber}>15</p>
                  <span className={styles.statSubtext}>+2 questo mese</span>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaUserTie />
                </div>
                <div className={styles.statContent}>
                  <h3>Addetti OdV</h3>
                  <p className={styles.statNumber}>8</p>
                  <span className={styles.statSubtext}>3 scadenze prossime</span>
                </div>
              </div>
            </div>

            <div className={styles.actionsGrid}>
              <div 
                className={styles.actionCard}
                onClick={() => setActiveView("new-client")}
              >
                <FaPlus className={styles.actionIcon} />
                <h3>Nuovo Cliente</h3>
                <p>Aggiungi un nuovo cliente al sistema</p>
              </div>

              <div 
                className={styles.actionCard}
                onClick={() => setActiveView("new-odv")}
              >
                <FaPlus className={styles.actionIcon} />
                <h3>Nuovo Addetto OdV</h3>
                <p>Crea un nuovo addetto Organismo di Vigilanza</p>
              </div>
            </div>

            <div className={styles.recentActivity}>
              <h3>Attività Recenti</h3>
              <div className={styles.activityList}>
                <div className={styles.activityItem}>
                  <span className={styles.activityDate}>12/06/2025</span>
                  <span className={styles.activityText}>Creato cliente "Azienda XYZ S.r.l."</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityDate}>10/06/2025</span>
                  <span className={styles.activityText}>Addetto OdV "Mario Rossi" - Scadenza carica aggiornata</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityDate}>08/06/2025</span>
                  <span className={styles.activityText}>Nuovo addetto OdV "Laura Bianchi" assegnato</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            onClick={() => router.push("/dashboard")} 
            className={styles.backButton}
          >
            <FaArrowLeft /> Dashboard
          </button>
          <h1 className={styles.title}>
            {activeView === "overview" && "Dashboard Amministratore"}
            {activeView === "new-client" && "Nuovo Cliente"}
            {activeView === "new-odv" && "Nuovo Addetto OdV"}
          </h1>
        </div>
      </div>

      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
