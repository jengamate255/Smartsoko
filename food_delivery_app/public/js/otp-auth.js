/**
 * OTP Authentication Component
 * Handles OTP send/verify for phone-based authentication
 */

// Global OTP state
window.OTPAuth = {
  currentPhone: null,
  countdownTimer: null,
  
  // Send OTP to phone
  async sendOTP(phone, btnElement) {
    const normalizedPhone = this.normalizePhone(phone);
    
    try {
      this.setButtonLoading(btnElement, true);
      
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.currentPhone = data.phone;
        this.showOTPForm(data.phone);
        this.startCountdown(300); // 5 minutes
        this.showToast('OTP sent to ' + data.phone, 'success');
      } else {
        this.showToast(data.error || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      this.showToast('Network error. Please try again.', 'error');
    } finally {
      this.setButtonLoading(btnElement, false);
    }
  },
  
  // Verify OTP
  async verifyOTP(otp, btnElement) {
    if (!this.currentPhone) {
      this.showToast('Session expired. Please request OTP again.', 'error');
      return;
    }
    
    try {
      this.setButtonLoading(btnElement, true);
      
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: this.currentPhone, otp })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.clearCountdown();
        this.showToast('Phone verified successfully!', 'success');
        
        if (data.token) {
          // Sign in with custom token, then redirect
          await this.signInWithToken(data.token, data.user, data.phone);
        } else if (data.user) {
          this.handleVerifiedUser(data.user);
        } else {
          window.location.href = '/onboarding?phone=' + encodeURIComponent(data.phone);
        }
      } else {
        this.showToast(data.error || 'Invalid OTP', 'error');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      this.showToast('Network error. Please try again.', 'error');
    } finally {
      this.setButtonLoading(btnElement, false);
    }
  },
  
  // Resend OTP
  async resendOTP(btnElement) {
    if (!this.currentPhone) {
      this.showToast('Session expired. Please enter phone again.', 'error');
      return;
    }
    
    try {
      this.setButtonLoading(btnElement, true);
      
      const response = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: this.currentPhone })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.startCountdown(300);
        this.showToast('OTP resent successfully', 'success');
      } else {
        this.showToast(data.error || 'Failed to resend OTP', 'error');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      this.showToast('Network error. Please try again.', 'error');
    } finally {
      this.setButtonLoading(btnElement, false);
    }
  },
  
  // Sign in with Firebase custom token
  async signInWithToken(token, user, phone) {
    try {
      const { signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      const auth = window.auth;
      if (!auth) throw new Error('Firebase Auth not initialized on page');
      await signInWithCustomToken(auth, token);
      if (user && user.onboardingComplete === false) {
        window.location.href = '/onboarding';
      } else if (user) {
        this.handleVerifiedUser(user);
      } else {
        window.location.href = '/onboarding?phone=' + encodeURIComponent(phone);
      }
    } catch (e) {
      console.error('Custom token sign-in failed:', e);
      this.showToast('Sign-in failed. Please try again.', 'error');
    }
  },

  // Handle verified user - redirect based on role
  async handleVerifiedUser(user) {
    const role = user.role || 'customer';
    const redirectMap = {
      admin: '/admin',
      merchant: '/merchant',
      seller: '/merchant',
      driver: '/driver',
      customer: '/'
    };
    const target = redirectMap[role] || '/';
    const redirectModule = window.SmartSokoOnboarding && window.SmartSokoOnboarding.redirectAfterAuth;
    if (redirectModule) {
      redirectModule(user, role);
    } else {
      window.location.href = target;
    }
  },
  
  // Show OTP input form
  showOTPForm(phone) {
    const container = document.getElementById('otp-container');
    const phoneDisplay = document.getElementById('otp-phone-display');
    
    if (phoneDisplay) {
      phoneDisplay.textContent = this.formatPhone(phone);
    }
    
    if (container) {
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Focus first input
    setTimeout(() => {
      const firstInput = document.querySelector('.otp-input');
      if (firstInput) firstInput.focus();
    }, 100);
  },
  
  // Countdown timer for OTP expiry
  startCountdown(seconds) {
    this.clearCountdown();
    const countdownEl = document.getElementById('otp-countdown');
    const resendBtn = document.getElementById('resend-otp-btn');
    
    let remaining = seconds;
    const update = () => {
      if (countdownEl) {
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        countdownEl.textContent = `${m}:${s}`;
      }
      if (remaining <= 0) {
        this.clearCountdown();
        if (resendBtn) resendBtn.disabled = false;
        return;
      }
      remaining--;
      this.countdownTimer = setTimeout(update, 1000);
    };
    
    if (resendBtn) resendBtn.disabled = true;
    update();
  },
  
  clearCountdown() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) resendBtn.disabled = false;
  },
  
  // Normalize phone to +255XXXXXXXXX
  normalizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    } else if (!cleaned.startsWith('255')) {
      cleaned = '255' + cleaned;
    }
    return '+' + cleaned;
  },
  
  // Format phone for display: +255 XXX XXX XXX
  formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12) { // 255XXXXXXXXX
      return '+' + cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
    }
    return phone;
  },
  
  setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Sending...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  },
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// OTP Input auto-focus handling
document.addEventListener('input', (e) => {
  if (e.target.matches('.otp-input')) {
    const value = e.target.value;
    if (value.length === 1) {
      const next = e.target.nextElementSibling;
      if (next && next.matches('.otp-input')) next.focus();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('.otp-input') && e.key === 'Backspace' && !e.target.value) {
    const prev = e.target.previousElementSibling;
    if (prev && prev.matches('.otp-input')) prev.focus();
  }
});