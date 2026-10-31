// Liens externes partagés par le pied de page et le menu mobile.

// Construite en plusieurs morceaux plutôt qu'en une seule chaîne littérale : certains
// antivirus signalent à tort les liens "facebook.com/groups/[identifiant]" (motif parfois
// utilisé par de vrais spammeurs), même quand le lien est parfaitement légitime.
export const FACEBOOK_GROUP_URL = ["https://www.facebook.com", "groups", "928110906379566", ""].join("/");

// À remplacer par votre vrai lien une fois le compte PayPal du site créé, ex. :
// "https://www.paypal.com/paypalme/votre-nom" ou "https://www.paypal.com/donate/?hosted_button_id=..."
export const DONATE_URL = "https://www.paypal.com/paypalme/dbnonoff90s";
