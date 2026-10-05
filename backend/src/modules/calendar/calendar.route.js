const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const {
  getNormalizedEvents,
  getSyncSettings,
  updateSyncSettings,
  generateAppleFeed,
  regenerateAppleFeed,
  disableAppleFeed,
  getIcsFeed,
  getGoogleAuthUrl,
  googleCallback,
  syncGoogle,
  disconnectGoogle,
  getMicrosoftAuthUrl,
  microsoftCallback,
  syncMicrosoft,
  disconnectMicrosoft,
  syncAll,
  create,
  getAll,
  getOne,
  update,
  remove,
} = require('./calendar.controller');

// ==========================================
// Public Routes (No JWT required)
// ==========================================
// 1. ICS Calendar Feed (authenticated via token in path)
router.get('/feed/:token', getIcsFeed);

// 2. OAuth Callbacks (redirect targets from Google & Microsoft)
router.get('/oauth/google/callback',    googleCallback);
router.get('/oauth/microsoft/callback', microsoftCallback);

// ==========================================
// Authenticated Calendar Routes (Require JWT)
// ==========================================
router.use(auth);

// Normalized events & sync settings
router.get('/events',           getNormalizedEvents);
router.get('/sync-settings',    getSyncSettings);
router.patch('/sync-settings',  updateSyncSettings);

// Apple Calendar / ICS Feed management
router.post('/feed/generate',   generateAppleFeed);
router.post('/feed/regenerate', regenerateAppleFeed);
router.post('/feed/disable',    disableAppleFeed);

// Google Calendar OAuth & Sync
router.get('/oauth/google/auth-url',   getGoogleAuthUrl);
router.post('/oauth/google/disconnect', disconnectGoogle);
router.post('/sync/google',             syncGoogle);

// Microsoft Outlook OAuth & Sync
router.get('/oauth/microsoft/auth-url',   getMicrosoftAuthUrl);
router.post('/oauth/microsoft/disconnect', disconnectMicrosoft);
router.post('/sync/microsoft',             syncMicrosoft);

// Global sync
router.post('/sync/all', syncAll);

// Standard calendar CRUD
router.post('/',      create);
router.get('/',       getAll);
router.get('/:id',    getOne);
router.put('/:id',    update);
router.delete('/:id', remove);

module.exports = router;
