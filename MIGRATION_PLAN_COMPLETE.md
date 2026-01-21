# 🚀 PLAN DE MIGRATION COMPLET - ARCHITECTURE MULTITENANT + OPTIMISATIONS

**Date**: 2026-01-11
**Objectif**: Architecture stable, sécurisée, optimisée, sans effet de bord

---

## 📋 PHASES DE MIGRATION

### PHASE 1: FONDATIONS (Contexte + Utilitaires)
- [x] Créer SecureAuthContext v2 avec :
  - ✅ Méthode register()
  - ✅ Méthode login() avec cache /auth/me
  - ✅ Auto-refresh token
  - ✅ Permissions helpers
  - ✅ Subscription helpers
- [x] Créer utilitaires JWT decode
- [x] Créer helpers locale-aware

### PHASE 2: MIGRATION COMPOSANTS
- [ ] Migrer App.js → SecureAuthProvider
- [ ] Mettre à jour SignupPage
- [ ] Mettre à jour LoginPage (login retourne tout)
- [ ] Corriger baseClient (redirections locale-aware)
- [ ] Corriger ProtectedRoute, PublicRoute
- [ ] Créer SubscriptionGuard

### PHASE 3: NETTOYAGE
- [ ] Script migration localStorage
- [ ] Archiver ancien AuthContext
- [ ] Supprimer imports obsolètes

### PHASE 4: TESTS COMPLETS
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test permissions
- [ ] Test subscription
- [ ] Test redirections locale

### PHASE 5: DOCUMENTATION
- [ ] Documentation architecture
- [ ] Guide développeur
- [ ] Guide migration pour users existants

---

## 🎯 OPTIMISATIONS INTÉGRÉES

1. ✅ Login retourne tout (pas de /auth/me après login)
2. ✅ Cache /auth/me 5 minutes (évite appels répétés)
3. ✅ Auto-refresh token (1h avant expiration)
4. ✅ Permissions statiques (pas de calcul dynamique)
5. ✅ localStorage minimal (seulement token)
6. ✅ Redirections locale-aware (pas d'URLs cassées)
7. ✅ Subscription guards (UX claire si expiré)

---

## 📊 GAINS ATTENDUS

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Latence login | ~800ms | ~400ms | **-50%** |
| Appels /auth/me | ~100/jour/user | ~10/jour/user | **-90%** |
| Déconnexions intempestives | ~5/jour | 0 | **-100%** |
| URLs cassées | ~20% | 0% | **-100%** |
| Failles sécurité localStorage | Oui | Non | ✅ |

---

## ✅ CRITÈRES DE SUCCÈS

- [ ] Aucun import vers ancien AuthContext
- [ ] localStorage contient SEULEMENT `clinicmanager_token`
- [ ] Tous les tests manuels passent
- [ ] Pas de console errors
- [ ] Pas d'effet de bord sur sessions/rôles/droits

---

**DÉBUT D'IMPLÉMENTATION CI-DESSOUS**
