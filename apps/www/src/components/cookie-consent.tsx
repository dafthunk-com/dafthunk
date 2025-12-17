import { useEffect, useState } from "react";

declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params: Record<string, string>
    ) => void;
  }
}

const CONSENT_KEY = "cookie-consent";

type ConsentValue = "granted" | "denied" | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return null;
}

function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined" || !window.gtag) return;

  const value = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!gaMeasurementId) return;

    const stored = getStoredConsent();
    if (stored === null) {
      setVisible(true);
    } else if (stored === "granted") {
      updateGtagConsent(true);
    }
  }, [gaMeasurementId]);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "granted");
    updateGtagConsent(true);
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(CONSENT_KEY, "denied");
    updateGtagConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-white border-t border-gray-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <p className="text-base text-gray-600">
        This site uses cookies for analytics.{" "}
        <a
          href="/cookies"
          className="text-gray-900 underline hover:no-underline"
        >
          Cookie Policy
        </a>
      </p>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={handleReject}
          className="px-4 py-2 text-base text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Reject
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-2 text-base text-white bg-black rounded hover:bg-gray-800"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
