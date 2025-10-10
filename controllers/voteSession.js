const { Test } = require("../models/Test");
const { User } = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { v4: uuidv4 } = require('uuid');
const { sendTestVotedNotification } = require("./notification");

// Start Vote Session
const startVoteSession = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const userId = req.user ? req.user.userId : null;
    
    const test = await Test.findById(testId);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    if (!test.isActive) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Start vote session
    const session = await test.startVoteSession(sessionId, userId);
    
    // Populate the session data
    const populatedSession = await Test.findById(testId)
      .populate('voteSessions.currentPair')
      .populate('voteSessions.remainingOptions')
      .populate('voteSessions.winners')
      .populate('voteSessions.finalWinner')
      .then(test => test.voteSessions.find(s => s.sessionId === sessionId));

    res.status(StatusCodes.OK).json({
      success: true,
      session: populatedSession,
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        headerText: test.headerText,
        footerText: test.footerText,
        category: test.category
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Vote Session
const getVoteSession = async (req, res, next) => {
  try {
    const { testId, sessionId } = req.params;
    
    const test = await Test.findById(testId)
      .populate('voteSessions.currentPair')
      .populate('voteSessions.remainingOptions')
      .populate('voteSessions.winners')
      .populate('voteSessions.finalWinner');
    
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    const session = test.getVoteSession(sessionId);
    if (!session) {
      throw new CustomError.NotFoundError("Vote session bulunamadı");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      session,
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        headerText: test.headerText,
        footerText: test.footerText,
        category: test.category
      }
    });
  } catch (error) {
    next(error);
  }
};

// Vote on Option
const voteOnOption = async (req, res, next) => {
  try {
    const { testId, sessionId } = req.params;
    const { optionId } = req.body;
    const userId = req.user ? req.user.userId : null;

    if (!optionId) {
      throw new CustomError.BadRequestError("Seçenek ID gereklidir");
    }

    const test = await Test.findById(testId);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    if (!test.isActive) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    const session = test.getVoteSession(sessionId);
    if (!session) {
      throw new CustomError.NotFoundError("Vote session bulunamadı");
    }

    if (session.isComplete) {
      throw new CustomError.BadRequestError("Bu vote session zaten tamamlanmış");
    }

    // Verify the option is in current pair
    const isInCurrentPair = session.currentPair.some(id => id.toString() === optionId);
    if (!isInCurrentPair) {
      throw new CustomError.BadRequestError("Seçilen seçenek mevcut karşılaştırmada değil");
    }

    // Update vote session
    await test.updateVoteSession(sessionId, optionId);

    // Get updated session with populated data
    const updatedTest = await Test.findById(testId)
      .populate('voteSessions.currentPair')
      .populate('voteSessions.remainingOptions')
      .populate('voteSessions.winners')
      .populate('voteSessions.finalWinner');
    
    const updatedSession = updatedTest.getVoteSession(sessionId);

    // Send notification if user is authenticated and session is complete
    if (userId && updatedSession.isComplete) {
      try {
        const user = await User.findById(userId);
        if (user) {
          sendTestVotedNotification(userId, {
            testId: test._id,
            testTitle: test.title,
            testSlug: test.slug
          }).catch(console.error);
        }
      } catch (error) {
        console.error('Error sending vote notification:', error);
        // Don't fail the request if notification fails
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      session: updatedSession,
      message: updatedSession.isComplete ? "Vote tamamlandı!" : "Vote başarıyla kaydedildi"
    });
  } catch (error) {
    next(error);
  }
};

// Get Test Results with Vote Statistics
const getTestResultsWithStats = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId)
      .populate('createdBy', 'name surname')
      .populate('voteSessions.finalWinner');

    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Calculate vote statistics from completed sessions (both user and guest sessions)
    const completedSessions = test.voteSessions.filter(session => session.isComplete && session.finalWinner);
    
    // Count votes for each option
    const optionVoteCounts = {};
    test.options.forEach(option => {
      optionVoteCounts[option._id.toString()] = 0;
    });

    completedSessions.forEach(session => {
      if (session.finalWinner) {
        const winnerId = session.finalWinner._id ? session.finalWinner._id.toString() : session.finalWinner.toString();
        optionVoteCounts[winnerId] = (optionVoteCounts[winnerId] || 0) + 1;
      }
    });

    const totalVotes = completedSessions.length;

    // Create results with percentages
    const results = test.options.map(option => {
      const voteCount = optionVoteCounts[option._id.toString()] || 0;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
      
      return {
        _id: option._id,
        title: option.title,
        image: option.image,
        customFields: option.customFields,
        votes: voteCount,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        winRate: option.winRate // Keep original winRate for backward compatibility
      };
    }).sort((a, b) => b.votes - a.votes);

    res.status(StatusCodes.OK).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        headerText: test.headerText,
        footerText: test.footerText,
        category: test.category,
        totalVotes: totalVotes,
        totalSessions: test.voteSessions.length,
        completedSessions: completedSessions.length,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      },
      results: results.map((result, index) => ({
        rank: index + 1,
        ...result
      })),
      statistics: {
        totalVotes: totalVotes,
        totalSessions: test.voteSessions.length,
        completedSessions: completedSessions.length,
        guestSessions: test.voteSessions.filter(s => s.isGuest).length,
        userSessions: test.voteSessions.filter(s => !s.isGuest).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Vote Session
const deleteVoteSession = async (req, res, next) => {
  try {
    const { testId, sessionId } = req.params;
    const userId = req.user ? req.user.userId : null;

    const test = await Test.findById(testId);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    const session = test.getVoteSession(sessionId);
    if (!session) {
      throw new CustomError.NotFoundError("Vote session bulunamadı");
    }

    // Check if user owns this session (for authenticated users)
    if (userId && session.userId && session.userId.toString() !== userId.toString()) {
      throw new CustomError.UnauthorizedError("Bu vote session'ı silme yetkiniz yok");
    }

    await test.deleteVoteSession(sessionId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Vote session başarıyla silindi"
    });
  } catch (error) {
    next(error);
  }
};

// Get User's Vote Sessions
const getUserVoteSessions = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { testId } = req.params;

    const filter = { 'voteSessions.userId': userId };
    if (testId) {
      filter._id = testId;
    }

    const tests = await Test.find(filter)
      .populate('voteSessions.finalWinner')
      .select('title category voteSessions');

    const userSessions = [];
    tests.forEach(test => {
      const sessions = test.voteSessions.filter(session => 
        session.userId && session.userId.toString() === userId.toString()
      );
      sessions.forEach(session => {
        userSessions.push({
          _id: session._id,
          sessionId: session.sessionId,
          testId: test._id,
          testTitle: test.title,
          testCategory: test.category,
          isComplete: session.isComplete,
          finalWinner: session.finalWinner,
          startedAt: session.startedAt,
          completedAt: session.completedAt
        });
      });
    });

    res.status(StatusCodes.OK).json({
      success: true,
      sessions: userSessions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startVoteSession,
  getVoteSession,
  voteOnOption,
  getTestResultsWithStats,
  deleteVoteSession,
  getUserVoteSessions
};
