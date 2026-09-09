import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Archives Carddass — Base de référence des cartes Dragon Ball",
  description:
    "Catalogue et archive de collections de cartes Dragon Ball, Dragon Ball Z et dérivés : Carddass, Panini et plus.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
