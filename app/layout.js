import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "DB Non-Off 90's — Archive de référence des cartes Dragon Ball non-officielles",
  description:
    "Catalogue et archive de collections de cartes Dragon Ball non-officielles des années 90 (Taïwan, Hong Kong, Malaisie...).",
};

export default function RootLayout({ children }) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DB Non-Off 90's",
    url: SITE_URL,
    description:
      "Archive communautaire à but non lucratif des cartes Dragon Ball non-officielles des années 90, non affiliée à Bandai ni à Toei Animation.",
  };

  return (
    <html lang="fr">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <ThemeProvider>
          <LanguageProvider>
            <CurrentUserProvider>
              <Analytics />
              <Nav />
              <div className="glossy-divider" />
              <div style={{ flex: 1 }}>{children}</div>
              <div className="glossy-divider" />
              <Footer />
            </CurrentUserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
