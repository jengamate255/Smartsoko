const updateAlert = {
  container: null,
  alerts: [],
  maxAlerts: 5,

  // Initialize the update alert system
  init() {
    // Create alert container
    this.container = document.createElement("div");
    this.container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
    document.body.appendChild(this.container);
  },

  // Show an update alert
  show(message, type = "info", title = null) {
    const alert = {
      id: Date.now(),
      message,
      type,
      title,
      timestamp: new Date()
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    this.renderAlert(alert);
  },

  // Render a single alert
  renderAlert(alert) {
    const alertElement = document.createElement("div");
    alertElement.className = "bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 mb-2 transform: translateX(100%) opacity:0 transition-all duration-300 border-l-4 border-l-solid";

    // Set border color based on type
    if (alert.type === "success") {
      alertElement.classList.add("border-green-500");
    } else if (alert.type === "error") {
      alertElement.classList.add("border-red-500");
    } else if (alert.type === "warning") {
      alertElement.classList.add("border-yellow-500");
    } else {
      alertElement.classList.add("border-blue-500");
    }

    // Build content
    let icon = "";
    if (alert.type === "success") icon = 'check_circle';
    else if (alert.type === "error") icon = 'error';
    else if (alert.type === "warning") icon = 'warning';
    else icon = 'info';

    alertElement.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-lg ${icon}"></span>
        </div>
        <div class="flex-1">
          ${alert.title ? `<div class="font-semibold text-sm mb-1">${alert.title}</div>` : ''}
          <div class="text-sm ${alert.type === 'error' ? 'text-red-700' : alert.type === 'success' ? 'text-green-700' : alert.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'}">
            ${alert.message}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `;

    this.container.appendChild(alertElement);

    // Animate in
    requestAnimationFrame(() => {
      alertElement.style.transform = 'translateX(0)'
      alertElement.style.opacity = '1'
    })

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeAlert(alert.id)
    }, 5000)
  },

  // Remove an alert
  removeAlert(id) {
    if (this.container) {
      const element = this.container.querySelector('.border-l-4:not([style*=\"display: none\"])')
      if (element) {
        element.style.transform = 'translateX(100%)'
        element.style.opacity = '0'
        setTimeout(() => {
          element.remove()
        }, 300)
      }
    }
  },

  // Clear all alerts
  clear() {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.alerts = []
  },

  // Handle update alerts from Firestore
  handleUpdate(orderId, action, status) {
    const message = getUpdateMessage(action, orderId, status)
    const title = getUpdateTitle(action)

    this.show(message, 'info', title)
  }
};

// Helper functions
function getUpdateMessage(action, orderId, status) {
  const messages = {
    'created': `New order #${orderId}`,
    'updated': `Order #${orderId} status changed to ${status}`,
    'deleted': `Order #${orderId} was deleted`,
    'admin': `Admin notification: Order #${orderId}`
  };
  return messages[action] || `Order #${orderId} updated`
}

function getUpdateTitle(action) {
  const titles = {
    'created': 'New Order',
    'updated': 'Order Updated',
    'deleted': 'Order Deleted',
    'admin': 'Admin Notice'
  };
  return titles[action] || 'Update'
}

// Make updateAlert available globally
window.updateAlert = updateAlert;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (!updateAlert.container) {
    updateAlert.init()
  }
});