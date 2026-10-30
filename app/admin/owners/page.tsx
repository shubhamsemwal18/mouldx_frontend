"use client";

import { useMemo, useState } from "react";
import styles from "./Owners.module.css";

interface Document {
  label: string;
  previewUrl: string;
}

interface Owner {
  id: string;
  name: string;
  firmName: string;
  phone: string;
  emailPoc: string;
  pan: string;
  firmEmail: string;
  address: string;
  gstNo: string;
  msmeNo: string;
  bankAccount: string;
  ifsc: string;
  accountHolder: string;
  bankName: string;
  upiId: string;
  approvedOn: string;
  mouldsCount: number;
  initial: string;
  gradient: string;
  documents: Document[];
}

// TEMP dummy data — real API se aayega (owners jinki KYC approve ho chuki hai)
const INITIAL_OWNERS: Owner[] = [
  {
    id: "1",
    name: "Rohit Sharma",
    firmName: "Sharma Industries",
    phone: "+91 98XXXXXX10",
    emailPoc: "rohit@sharmaind.com",
    pan: "ABCDE1234F",
    firmEmail: "info@sharmaind.com",
    address: "Plot 12, MIDC Industrial Area, Pune, Maharashtra 411019",
    gstNo: "27ABCDE1234F1Z5",
    msmeNo: "UDYAM-MH-03-1122334",
    bankAccount: "•••• •••• 4021",
    ifsc: "HDFC0001234",
    accountHolder: "Rohit Sharma",
    bankName: "HDFC Bank",
    upiId: "rohit@hdfcbank",
    approvedOn: "14 Sep 2026",
    mouldsCount: 8,
    initial: "R",
    gradient: "linear-gradient(135deg, #22d3ee, #2563eb)",
    documents: [
      { label: "PAN Card", previewUrl: "https://picsum.photos/seed/pan1/900/600" },
      { label: "GST Certificate", previewUrl: "https://picsum.photos/seed/gst1/900/600" },
      { label: "Electricity Bill", previewUrl: "https://picsum.photos/seed/eb1/900/600" },
    ],
  },
  {
    id: "2",
    name: "Vikram Rao",
    firmName: "Vector Molds",
    phone: "+91 97XXXXXX22",
    emailPoc: "vikram@vectormolds.com",
    pan: "PQRSX5678K",
    firmEmail: "contact@vectormolds.com",
    address: "B-14, Industrial Estate, Nashik, Maharashtra 422007",
    gstNo: "27PQRSX5678K1Z2",
    msmeNo: "UDYAM-MH-04-2233445",
    bankAccount: "•••• •••• 7788",
    ifsc: "ICIC0002345",
    accountHolder: "Vikram Rao",
    bankName: "ICICI Bank",
    upiId: "vikram@icici",
    approvedOn: "12 Sep 2026",
    mouldsCount: 5,
    initial: "V",
    gradient: "linear-gradient(135deg, #818cf8, #7c3aed)",
    documents: [
      { label: "PAN Card", previewUrl: "https://picsum.photos/seed/pan2/900/600" },
      { label: "GST Certificate", previewUrl: "https://picsum.photos/seed/gst2/900/600" },
    ],
  },
  {
    id: "3",
    name: "Anjali Deshpande",
    firmName: "Apex Poly",
    phone: "+91 96XXXXXX88",
    emailPoc: "anjali@apexpoly.com",
    pan: "LMNOP4321Z",
    firmEmail: "info@apexpoly.com",
    address: "Sector 5, Aurangabad, Maharashtra 431001",
    gstNo: "27LMNOP4321Z1Z9",
    msmeNo: "UDYAM-MH-05-3344556",
    bankAccount: "•••• •••• 9012",
    ifsc: "SBIN0003456",
    accountHolder: "Anjali Deshpande",
    bankName: "State Bank of India",
    upiId: "anjali@sbi",
    approvedOn: "11 Sep 2026",
    mouldsCount: 3,
    initial: "A",
    gradient: "linear-gradient(135deg, #34d399, #059669)",
    documents: [
      { label: "PAN Card", previewUrl: "https://picsum.photos/seed/pan3/900/600" },
      { label: "GST Certificate", previewUrl: "https://picsum.photos/seed/gst3/900/600" },
      { label: "Electricity Bill", previewUrl: "https://picsum.photos/seed/eb3/900/600" },
    ],
  },
];

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>(INITIAL_OWNERS);
  const [search, setSearch] = useState("");
  const [viewOwner, setViewOwner] = useState<Owner | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  const filtered = useMemo(() => {
    if (search.trim() === "") return owners;
    const q = search.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.firmName.toLowerCase().includes(q) ||
        o.gstNo.toLowerCase().includes(q)
    );
  }, [owners, search]);

  const handleDelete = (id: string) => {
    // TODO: call delete-owner API
    setOwners((prev) => prev.filter((o) => o.id !== id));
    setConfirmDeleteId(null);
  };

  const ownerToDelete = owners.find((o) => o.id === confirmDeleteId);

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Hosts</h1>
          <p className={styles.subtitle}>Approved hosts live on the platform.</p>
        </div>
        <span className={styles.countPill}>{owners.length} TOTAL</span>
      </div>

      {/* ---------- Search ---------- */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by host name, firm, GST..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* ---------- Table (desktop) ---------- */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Host</th>
                <th>Firm</th>
                <th>GST No.</th>
                <th>Moulds</th>
                <th>Approved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((owner) => (
                <tr key={owner.id}>
                  <td>
                    <div className={styles.ownerCell}>
                      <span className={styles.avatar} style={{ background: owner.gradient }}>
                        {owner.initial}
                      </span>
                      <span className={styles.ownerName}>{owner.name}</span>
                    </div>
                  </td>
                  <td className={styles.mutedCell}>{owner.firmName}</td>
                  <td className={styles.mutedCell}>{owner.gstNo}</td>
                  <td className={styles.mouldsCell}>{owner.mouldsCount}</td>
                  <td className={styles.mutedCell}>{owner.approvedOn}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      onClick={() => setViewOwner(owner)}
                      className={styles.iconBtn}
                      aria-label="View details"
                    >
                      👁
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(owner.id)}
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label="Delete host"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p className={styles.emptyText}>No hosts match your search.</p>}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((owner) => (
          <div key={owner.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.avatar} style={{ background: owner.gradient }}>
                {owner.initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className={styles.ownerName}>{owner.name}</p>
                <p className={styles.mobileMeta}>{owner.firmName}</p>
              </div>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.mobileMeta}>
                {owner.mouldsCount} moulds · {owner.approvedOn}
              </span>
              <div className={styles.mobileActions}>
                <button
                  type="button"
                  onClick={() => setViewOwner(owner)}
                  className={styles.iconBtn}
                  aria-label="View details"
                >
                  👁
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(owner.id)}
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  aria-label="Delete host"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p className={styles.emptyText}>No hosts match your search.</p>}
      </div>

      {/* ---------- View details modal ---------- */}
      {viewOwner && (
        <div className={styles.modalOverlay} onClick={() => setViewOwner(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-3">
                <span className={styles.modalAvatar} style={{ background: viewOwner.gradient }}>
                  {viewOwner.initial}
                </span>
                <div>
                  <h3 className={styles.modalTitle}>{viewOwner.name}</h3>
                  <p className={styles.modalSubtitle}>{viewOwner.firmName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewOwner(null)}
                className={styles.modalCloseBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Documents with image previews */}
              <div className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>Submitted Documents</h4>
                <div className={styles.docsGrid}>
                  {viewOwner.documents.map((doc) => (
                    <button
                      key={doc.label}
                      type="button"
                      className={styles.docThumb}
                      onClick={() => setActiveDoc(doc)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.previewUrl} alt={doc.label} className={styles.docThumbImg} />
                      <span className={styles.docThumbLabel}>{doc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.modalDetailsGrid}>
                <div className={styles.modalSection}>
                  <h4 className={styles.modalSectionTitle}>Personal Details</h4>
                  <Row label="Name" value={viewOwner.name} />
                  <Row label="Phone No." value={viewOwner.phone} />
                  <Row label="Email ID – POC" value={viewOwner.emailPoc} isLast />
                </div>

                <div className={styles.modalSection}>
                  <h4 className={styles.modalSectionTitle}>Firm Details</h4>
                  <Row label="PAN" value={viewOwner.pan} />
                  <Row label="Email ID" value={viewOwner.firmEmail} />
                  <Row label="Firm Name" value={viewOwner.firmName} />
                  <Row label="Address" value={viewOwner.address} />
                  <Row label="GST No." value={viewOwner.gstNo} />
                  <Row label="MSME No." value={viewOwner.msmeNo} isLast />
                </div>

                <div className={styles.modalSection}>
                  <h4 className={styles.modalSectionTitle}>Payout Details</h4>
                  <Row label="Bank A/C No." value={viewOwner.bankAccount} />
                  <Row label="IFSC Code" value={viewOwner.ifsc} />
                  <Row label="Account Holder" value={viewOwner.accountHolder} />
                  <Row label="Bank Name" value={viewOwner.bankName} />
                  <Row label="UPI ID" value={viewOwner.upiId} isLast />
                </div>
              </div>

              <div className={styles.modalMetaRow}>
                <span className={styles.modalMetaPill}>{viewOwner.mouldsCount} moulds listed</span>
                <span className={styles.modalMetaPill}>Approved {viewOwner.approvedOn}</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(viewOwner.id);
                  setViewOwner(null);
                }}
                className={styles.modalDeleteBtn}
              >
                🗑 Delete Host
              </button>
              <button type="button" onClick={() => setViewOwner(null)} className={styles.modalCloseTextBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Document image lightbox ---------- */}
      {activeDoc && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveDoc(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <h3 className={styles.modalTitle}>{activeDoc.label}</h3>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className={styles.modalCloseBtn}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className={styles.lightboxBody}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeDoc.previewUrl} alt={activeDoc.label} className={styles.lightboxImage} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Delete confirmation modal ---------- */}
      {confirmDeleteId && ownerToDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete this host?</h3>
            <p className={styles.confirmText}>
              This will permanently remove <strong>{ownerToDelete.name}</strong> ({ownerToDelete.firmName}) and
              all their {ownerToDelete.mouldsCount} listed moulds from the platform. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDeleteId(null)} className={styles.confirmCancelBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className={styles.confirmDeleteBtn}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`${styles.modalRow} ${isLast ? styles.modalRowLast : ""}`}>
      <span className={styles.modalRowLabel}>{label}</span>
      <span className={styles.modalRowValue}>{value}</span>
    </div>
  );
}