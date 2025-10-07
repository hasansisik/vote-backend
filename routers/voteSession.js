const express = require('express');
const {
  startVoteSession,
  getVoteSession,
  voteOnOption,
  getTestResultsWithStats,
  deleteVoteSession,
  getUserVoteSessions
} = require('../controllers/voteSession');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (guests can use these)
router.post('/:testId/start', startVoteSession);
router.get('/:testId/session/:sessionId', getVoteSession);
router.post('/:testId/session/:sessionId/vote', voteOnOption);
router.get('/:testId/results', getTestResultsWithStats);

// Authenticated routes
router.get('/user/sessions', isAuthenticated, getUserVoteSessions);
router.get('/user/sessions/:testId', isAuthenticated, getUserVoteSessions);
router.delete('/:testId/session/:sessionId', deleteVoteSession);

module.exports = router;
