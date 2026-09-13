"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function ContactForm() {
  const { t } = useLanguage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(t.contactMessageTemplate);
  const [replyTo, setReplyTo] = useState("");
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, replyTo }),
      });
      if (res.ok) {
        setStatus("sent");
        setSubject("");
        setMessage("");
        setReplyTo("");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <div className="toast success">{t.contactSent}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel" style={{ marginTop: "1rem" }}>
      <div className="field">
        <span className="field-label">{t.contactSubjectLabel}</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <span className="field-label">{t.contactMessageLabel}</span>
        <textarea
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "0.5rem 0.6rem", fontSize: "0.85rem", fontFamily: "inherit" }}
        />
      </div>
      <div className="field">
        <span className="field-label">{t.contactEmailLabel}</span>
        <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
      </div>
      {status === "error" && <div className="toast error">{t.contactError}</div>}
      <button className="btn-primary" type="submit" disabled={status === "sending"}>
        {status === "sending" ? t.contactSending : t.contactSend}
      </button>
    </form>
  );
}
