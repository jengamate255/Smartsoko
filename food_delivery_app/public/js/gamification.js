/**
 * Gamification Module
 * Handles badges, streaks, and achievements for merchants
 */

const BADGES = [
  { id: 'first_order', name: 'First Order', description: 'Complete your first order', icon: 'shopping_bag', tier: 'bronze' },
  { id: 'ten_orders', name: 'Getting Started', description: 'Complete 10 orders', icon: 'local_shipping', tier: 'bronze' },
  { id: 'fifty_orders', name: 'Busy Bee', description: 'Complete 50 orders', icon: 'flash_on', tier: 'silver' },
  { id: 'hundred_orders', name: 'Century Club', description: 'Complete 100 orders', icon: 'star', tier: 'gold' },
  { id: 'five_star', name: 'Five Star', description: 'Maintain 5.0 rating for 10 orders', icon: 'grade', tier: 'gold' },
  { id: 'early_bird', name: 'Early Bird', description: 'Open before 7 AM for 5 days', icon: 'wb_sunny', tier: 'silver' },
  { id: 'night_owl', name: 'Night Owl', description: 'Serve after 10 PM for 5 days', icon: 'nightlight_round', tier: 'silver' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Average prep time under 15 min', icon: 'speed', tier: 'gold' },
  { id: 'loyal_customers', name: 'Loyal Following', description: '10 repeat customers', icon: 'people', tier: 'gold' },
  { id: 'revenue_milestone_1', name: 'First 100k', description: 'Earn TSh 100,000', icon: 'attach_money', tier: 'bronze' },
  { id: 'revenue_milestone_2', name: 'Half Million', description: 'Earn TSh 500,000', icon: 'account_balance', tier: 'silver' },
  { id: 'revenue_milestone_3', name: 'Millionaire', description: 'Earn TSh 1,000,000', icon: 'diamond', tier: 'gold' },
];

const TIER_ORDER = { bronze: 1, silver: 2, gold: 3 };

export class Gamification {
  constructor() {
    this.badges = BADGES;
    this.userBadges = new Set();
    this.stats = {
      totalOrders: 0,
      completedOrders: 0,
      averageRating: 0,
      totalRevenue: 0,
      streakDays: 0,
      repeatCustomers: 0
    };
    this.listeners = [];
  }

  /**
   * Initialize gamification for a seller
   * @param {string} sellerId - Seller ID
   */
  async init(sellerId) {
    this.sellerId = sellerId;
    await this.loadProgress();
    this.checkAllBadges();
    return this;
  }

  /**
   * Load user progress from storage/backend
   */
  async loadProgress() {
    try {
      // Load from localStorage as fallback
      const saved = localStorage.getItem(`gamification_${this.sellerId}`);
      if (saved) {
        const data = JSON.parse(saved);
        this.userBadges = new Set(data.badges || []);
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (error) {
      console.warn('Could not load gamification progress:', error);
    }
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    try {
      localStorage.setItem(`gamification_${this.sellerId}`, JSON.stringify({
        badges: Array.from(this.userBadges),
        stats: this.stats,
        updatedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Could not save gamification progress:', error);
    }
  }

  /**
   * Check all badges and award newly earned ones
   */
  checkAllBadges() {
    const newlyEarned = [];

    this.badges.forEach(badge => {
      if (!this.userBadges.has(badge.id) && this.checkBadgeCondition(badge)) {
        this.awardBadge(badge.id);
        newlyEarned.push(badge);
      }
    });

    if (newlyEarned.length > 0) {
      this.notifyBadgeEarned(newlyEarned);
    }

    return newlyEarned;
  }

  /**
   * Check if a badge condition is met
   */
  checkBadgeCondition(badge) {
    switch (badge.id) {
      case 'first_order':
        return this.stats.completedOrders >= 1;
      case 'ten_orders':
        return this.stats.completedOrders >= 10;
      case 'fifty_orders':
        return this.stats.completedOrders >= 50;
      case 'hundred_orders':
        return this.stats.completedOrders >= 100;
      case 'five_star':
        return this.stats.averageRating >= 5.0 && this.stats.completedOrders >= 10;
      case 'early_bird':
        return this.stats.earlyOpens >= 5;
      case 'night_owl':
        return this.stats.lateOpens >= 5;
      case 'speed_demon':
        return this.stats.averagePrepTime <= 15;
      case 'loyal_customers':
        return this.stats.repeatCustomers >= 10;
      case 'revenue_milestone_1':
        return this.stats.totalRevenue >= 100000;
      case 'revenue_milestone_2':
        return this.stats.totalRevenue >= 500000;
      case 'revenue_milestone_3':
        return this.stats.totalRevenue >= 1000000;
      default:
        return false;
    }
  }

  /**
   * Award a badge to the user
   */
  awardBadge(badgeId) {
    this.userBadges.add(badgeId);
    this.saveProgress();
    return this.getBadge(badgeId);
  }

  /**
   * Get badge by ID
   */
  getBadge(id) {
    return this.badges.find(b => b.id === id);
  }

  /**
   * Get all badges with earned status
   */
  getAllBadges() {
    return this.badges.map(badge => ({
      ...badge,
      earned: this.userBadges.has(badge.id),
      tierOrder: TIER_ORDER[badge.tier]
    })).sort((a, b) => {
      if (a.earned !== b.earned) return b.earned - a.earned;
      return b.tierOrder - a.tierOrder;
    });
  }

  /**
   * Get earned badges only
   */
  getEarnedBadges() {
    return this.getAllBadges().filter(b => b.earned);
  }

  /**
   * Update stats and check badges
   */
  updateStats(newStats) {
    this.stats = { ...this.stats, ...newStats };
    this.saveProgress();
    this.checkAllBadges();
  }

  /**
   * Record order completion
   */
  recordOrderCompletion(order) {
    this.stats.totalOrders++;
    if (order.status === 'completed' || order.status === 'delivered') {
      this.stats.completedOrders++;
      this.stats.totalRevenue += order.totalAmount || 0;
    }
    this.saveProgress();
    this.checkAllBadges();
  }

  /**
   * Record rating
   */
  recordRating(rating) {
    const total = this.stats.averageRating * (this.stats.completedOrders - 1) + rating;
    this.stats.averageRating = total / this.stats.completedOrders;
    this.saveProgress();
    this.checkAllBadges();
  }

  /**
   * Subscribe to badge changes
   */
  onBadgeChange(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of badge changes
   */
  notifyBadgeEarned(badges) {
    this.listeners.forEach(l => l(badges));
    badges.forEach(badge => {
      if (typeof window.showToast === 'function') {
        window.showToast(`🏆 Badge Earned: ${badge.name}!`, 'success');
      }
    });
  }

  /**
   * Get progress towards next badge
   */
  getNextBadgeProgress() {
    const unearned = this.badges.filter(b => !this.userBadges.has(b.id));
    if (unearned.length === 0) return null;

    // Return the closest badge to being earned
    return unearned.map(badge => ({
      badge,
      progress: this.calculateBadgeProgress(badge)
    })).sort((a, b) => b.progress - a.progress)[0];
  }

  calculateBadgeProgress(badge) {
    switch (badge.id) {
      case 'first_order':
        return Math.min(this.stats.completedOrders / 1, 1);
      case 'ten_orders':
        return Math.min(this.stats.completedOrders / 10, 1);
      case 'fifty_orders':
        return Math.min(this.stats.completedOrders / 50, 1);
      case 'hundred_orders':
        return Math.min(this.stats.completedOrders / 100, 1);
      case 'five_star':
        return Math.min(this.stats.averageRating / 5.0, 1);
      case 'revenue_milestone_1':
        return Math.min(this.stats.totalRevenue / 100000, 1);
      case 'revenue_milestone_2':
        return Math.min(this.stats.totalRevenue / 500000, 1);
      case 'revenue_milestone_3':
        return Math.min(this.stats.totalRevenue / 1000000, 1);
      default:
        return 0;
    }
  }
}

let gamificationInstance = null;

/**
 * Initialize gamification for current seller
 */
export function initGamification() {
  const sellerId = window.currentSeller?.id || window.currentUser?.uid;
  if (!sellerId) {
    console.warn('No seller ID for gamification');
    return createNullGamification();
  }

  gamificationInstance = new Gamification();
  gamificationInstance.init(sellerId);
  return gamificationInstance;
}

function createNullGamification() {
  return {
    loadBadges: () => {},
    checkBadges: () => [],
    getAllBadges: () => [],
    getEarnedBadges: () => [],
    getBadgeProgress: () => null,
    updateStats: () => {},
    recordOrderCompletion: () => {},
    recordRating: () => {},
    onBadgeChange: () => () => {},
    getNextBadgeProgress: () => null
  };
}

/**
 * Get gamification instance
 */
export function getGamification() {
  return gamificationInstance;
}

/**
 * Initialize gamification integration with merchant app
 */
export function initGamificationIntegration() {
  if (window.currentSeller?.id) {
    initGamification();
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.Gamification = Gamification;
  window.initGamification = initGamification;
  window.getGamification = getGamification;
  window.initGamificationIntegration = initGamificationIntegration;
}