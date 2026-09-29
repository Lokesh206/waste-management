const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Get Citizen Eco-Reward profile, points, level, badges, and leaderboard
 * GET /api/citizen/rewards
 */
async function getCitizenRewards(req, res) {
  try {
    const userId = req.user.id;

    // Fetch user rewards history
    const rewards = await prisma.ecoReward.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const totalPoints = rewards.reduce((sum, r) => sum + r.points, 0);

    // Compute Level & Badge
    let level = 'Level 1: Eco Scout';
    let nextThreshold = 100;
    if (totalPoints >= 500) {
      level = 'Level 4: Eco Champion';
      nextThreshold = 1000;
    } else if (totalPoints >= 250) {
      level = 'Level 3: Waste Buster';
      nextThreshold = 500;
    } else if (totalPoints >= 100) {
      level = 'Level 2: Green Sentinel';
      nextThreshold = 250;
    }

    const badges = [
      { id: 'scout', name: 'Eco Scout', icon: '🌱', unlocked: true, desc: 'Joined municipal clean city network' },
      { id: 'reporter', name: 'Clean Sentinel', icon: '🛡️', unlocked: totalPoints >= 50, desc: 'Reported verified dumping incident' },
      { id: 'scanner', name: 'AI Visionary', icon: '🔍', unlocked: totalPoints >= 100, desc: 'Classified 5+ waste items with AI' },
      { id: 'champion', name: 'Zero-Waste Champion', icon: '🏆', unlocked: totalPoints >= 250, desc: 'High municipal impact contribution' },
    ];

    // City-wide leaderboard (Top 5 citizens)
    const allCitizens = await prisma.user.findMany({
      where: { role: 'citizen', is_active: true },
      include: {
        ecoRewards: true,
      },
    });

    const leaderboard = allCitizens
      .map((c) => ({
        id: c.id,
        name: c.name,
        points: c.ecoRewards.reduce((s, r) => s + r.points, 0) || 50, // default seed baseline
        isCurrentUser: c.id === userId,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      totalPoints,
      level,
      nextThreshold,
      progressPercent: Math.min(100, Math.round((totalPoints / nextThreshold) * 100)),
      badges,
      rewardsHistory: rewards.slice(0, 10),
      leaderboard,
    });
  } catch (error) {
    logger.error('Error fetching citizen rewards', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to retrieve rewards.' });
  }
}

/**
 * Award points to citizen
 */
async function awardPoints(userId, points, reason, referenceType = null, referenceId = null) {
  try {
    const reward = await prisma.ecoReward.create({
      data: {
        user_id: userId,
        points,
        reason,
        reference_type: referenceType,
        reference_id: referenceId,
      },
    });
    return reward;
  } catch (e) {
    logger.error('Failed to award points', { error: e.message });
    return null;
  }
}

module.exports = {
  getCitizenRewards,
  awardPoints,
};
