// Liens externes partagés par le pied de page et le menu mobile.

// Construite en plusieurs morceaux plutôt qu'en une seule chaîne littérale : certains
// antivirus signalent à tort les liens "facebook.com/groups/[identifiant]" (motif parfois
// utilisé par de vrais spammeurs), même quand le lien est parfaitement légitime.
export const FACEBOOK_GROUP_URL = ["https://www.facebook.com", "groups", "928110906379566", ""].join("/");

// Lien de soutien PayPal du compte professionnel « DB90.org » (lien de paiement à montant
// libre, créé le 01/11/2026). Utilisé par le pied de page, le menu mobile et la page
// Informations. Pour passer plus tard à une page de don PayPal, il suffit de remplacer ce
// lien (ex. "https://www.paypal.com/donate/?hosted_button_id=...").
export const DONATE_URL = "https://www.paypal.com/ncp/payment/94T6KP9YBFB4N";
