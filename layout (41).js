import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "DB Non-Off 90's — Archive de référence des cartes Dragon Ball non-officielles",
  description:
    "Catalogue et archive de collections de cartes Dragon Ball non-officielles des années 90 (Taïwan, Hong Kong, Malaisie...).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <ThemeProvider>
          <LanguageProvider>
            <Analytics />
            <Nav />
            <div className="glossy-divider" />
            <div style={{ flex: 1 }}>{children}</div>
            <div className="glossy-divider" />
            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
