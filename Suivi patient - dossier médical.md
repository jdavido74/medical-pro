USER STORIES PAR THEMATIQUE  
1\. Gestion des Rôles et Permissions (RBAC)  
US-1.1 \- Création des Rôles

En tant qu'Administrateur de la clinique,  
je veux pouvoir créer et configurer des rôles avec des permissions spécifiques  
afin de respecter le principe de minimisation des accès.

Critères d'acceptation :

Pouvoir créer des rôles (Médecin traitant, Médecin collaborateur, Remplaçant, Secrétaire médicale, etc.)

Attribuer des permissions granulaires par rôle (lecture, écriture, modification, partage)

Historique des modifications de rôles

US-1.2 \- Attribution des Rôles

En tant qu'Administrateur,  
je veux pouvoir attribuer des rôles spécifiques à chaque utilisateur  
afin de limiter leur accès aux seules données nécessaires.

2\. Gestion Contextuelle des Accès  
US-2.1 \- Accès via Rendez-vous

En tant que Médecin,  
je veux automatiquement obtenir l'accès au dossier d'un patient lorsque celui-ci a un RDV avec moi  
afin de préparer et assurer sa consultation.

Critères d'acceptation :

Accès automatique 24h avant le RDV

Accès maintenu pendant 7 jours après le RDV pour suivi

Notification au patient de cet accès (option configurable)

US-2.2 \- Partage Manuel pour Avis

En tant que Médecin traitant,  
je veux pouvoir partager temporairement un dossier avec un confrère  
afin de demander un avis spécialisé.

Critères d'acceptation :

Sélection du confrère destinataire

Date d'expiration automatique (7 jours par défaut)

Motif du partage obligatoire

Notification au patient (optionnelle)

US-2.3 \- Mode Urgence

En tant que Médecin,  
je veux pouvoir accéder en urgence à un dossier vital  
afin de porter assistance à un patient en détresse.

Critères d'acceptation :

Accès limité aux données vitales (allergies, traitements, antécédents importants)

Justification obligatoire post-accès

Alerte automatique à l'administrateur

Double validation si possible

3\. Journalisation et Audit (Critique \!)  
US-3.1 \- Traçage Complet des Accès

En tant qu'Administrateur RGPD,  
je veux consulter l'historique complet de tous les accès aux dossiers  
afin de détecter les accès anormaux et me conformer à l'obligation de preuve.

Critères d'acceptation :

Logs infalsifiables : Qui, Quand, Quel dossier, Actions réalisées

Motif d'accès pour les partages manuels

Export des logs pour audit

Rétention des logs conforme RGPD (3 ans minimum)

US-3.2 \- Alertes de Suspicion

En tant que Système,  
je veux générer des alertes automatiques pour les accès suspects  
afin de prévenir les violations de confidentialité.

Critères d'acceptation :

Accès en dehors des heures de consultation

Accès à des dossiers sans lien avec le praticien

Volume anormal d'accès

Accès à son propre dossier ou celui de proches

4\. Gestion des Consentements  
US-4.1 \- Politique de Confidentialité

En tant que Patient,  
je veux comprendre comment mes données sont partagées au sein de la clinique  
afin de donner un consentement éclairé.

Critères d'acceptation :

Affichage clair de la politique de partage

Consentement explicite lors de la première consultation

Possibilité de retrait du consentement

US-4.2 \- Droit d'Opposition

En tant que Patient,  
je veux pouvoir m'opposer au partage de certaines informations sensibles  
afin de contrôler la diffusion de mes données les plus privées.

5\. Interface Patient  
US-5.1 \- Historique des Accès

En tant que Patient,  
je veux pouvoir consulter qui a accédé à mon dossier  
afin de vérifier le respect de ma confidentialité.

Critères d'acceptation :

Affichage des derniers accès (médecin, date, motif)

Interface simplifiée et compréhensible

Possibilité de signaler un accès suspect

6\. Fonctionnalités Administrateur  
US-6.1 \- Audit de Conformité

En tant qu'Administrateur,  
je veux pouvoir générer un rapport de conformité RGPD  
afin de prouver notre conformité lors des contrôles.

US-6.2 \- Gestion des Incidents

En tant qu'Administrateur,  
je veux pouvoir investiguer et documenter les incidents de sécurité  
afin de respecter les obligations de notification à la CNIL.

Points de Vigilance Technique  
Ne jamais faire confiance au client : Tous les checks de permissions doivent être côté serveur

Chiffrement des données sensibles au repos et en transit

Journalisation irréfutable des accès

Tests de pénétration obligatoires sur le système d'authentification

Backup sécurisé des logs d'audit