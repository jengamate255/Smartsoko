/**
 * Export & Snapshot Module for Dispatch Map
 * 
 * This module provides:
 * - CSV export functionality for visible orders
 * - Snapshot link generation and clipboard copy
 * - Snapshot link restoration from URL parameters
 * 
 * @module ExportModule
 */

/**
 * CSV export configuration
 * @typedef {Object} CSVConfig
 * @property {string[]} columns - Column headers for CSV
 * @property {Function} rowMapper - Function to map order to CSV row
 */

/**
 * Export module for dispatch map
 */
export class ExportModule {
  /**
   * Create a new ExportModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.state = {
      snapshotLink: null
    };
  }
  
  /**
   * Initialize the export module
   * @returns {Promise<void>}
   */
  async init() {
    console.log('ExportModule initialized');
  }
  
  /**
   * Destroy the export module
   */
  destroy() {
    console.log('ExportModule destroyed');
  }
  
  /**
   * Generate CSV content from orders
   * @param {Array} orders - Array of order objects
   * @returns {string} CSV content
   */
  generateCSV(orders) {
    if (!orders || orders.length === 0) {
      return '';
    }
    
    // Define CSV columns
    const columns = [
      'Order ID',
      'Customer Name',
      'Driver Name',
      'Merchant Name',
      'Status',
      'Delivery Address',
      'Order Total'
    ];
    
    // Map orders to CSV rows
    const rows = orders.map(order => {
      const customerName = order.customerName || 'N/A';
      const driverName = order.driverId ? this._getDriverName(order.driverId) : 'Unassigned';
      const merchantName = order.merchantId ? this._getMerchantName(order.merchantId) : 'N/A';
      const status = order.status || 'pending';
      const deliveryAddress = order.deliveryLocation?.label || order.deliveryAddress || 'N/A';
      const orderTotal = order.total ? this._formatCurrency(order.total) : 'N/A';
      
      // Escape CSV fields (handle commas, quotes, newlines)
      return [
        this._escapeCSVField(order.id),
        this._escapeCSVField(customerName),
        this._escapeCSVField(driverName),
        this._escapeCSVField(merchantName),
        this._escapeCSVField(status),
        this._escapeCSVField(deliveryAddress),
        this._escapeCSVField(orderTotal)
      ].join(',');
    });
    
    // Combine header and rows
    return [columns.join(','), ...rows].join('\n');
  }
  
  /**
   * Download CSV file
   * @param {Array} orders - Array of order objects to export
   * @param {string} filename - Optional filename (defaults to dispatch-export-YYYY-MM-DD.csv)
   */
  downloadCSV(orders, filename = null) {
    if (!orders || orders.length === 0) {
      console.warn('No orders to export');
      return;
    }
    
    // Generate CSV content
    const csvContent = this.generateCSV(orders);
    
    // Generate filename if not provided
    const downloadFilename = filename || `dispatch-export-${this._getTodayDateString()}.csv`;
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set download attributes
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }
  
  /**
   * Construct snapshot link from current map state
   * @returns {string} Snapshot URL with encoded state
   */
  constructSnapshotLink() {
    if (!this.dispatchMap.map) {
      console.warn('Map not initialized');
      return null;
    }
    
    // Get current map state
    const center = this.dispatchMap.map.getCenter();
    const zoom = this.dispatchMap.map.getZoom();
    const bounds = this.dispatchMap.map.getBounds();
    
    // Get active filters
    const filters = this.dispatchMap.state.ui.filters;
    
    // Get visible order IDs
    const visibleOrders = this._getVisibleOrders();
    const visibleOrderIds = visibleOrders.map(o => o.id);
    
    // Build query parameters
    const params = new URLSearchParams();
    params.set('center', `${center.lat},${center.lng}`);
    params.set('zoom', zoom.toFixed(2));
    params.set('bounds', `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`);
    
    // Add filters
    if (filters.unassignedOnly) params.set('filter_unassigned', 'true');
    if (filters.assignedNotPickedUp) params.set('filter_assigned_not_picked', 'true');
    if (filters.lateDeliveries) params.set('filter_late', 'true');
    if (filters.cashOnDelivery) params.set('filter_cod', 'true');
    if (filters.merchantId) params.set('filter_merchant', filters.merchantId);
    if (filters.hideApproximate) params.set('filter_hide_approx', 'true');
    
    // Add visible order IDs
    if (visibleOrderIds.length > 0) {
      params.set('visible_orders', visibleOrderIds.join(','));
    }
    
    // Construct full URL
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Copy snapshot link to clipboard
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async copySnapshotLinkToClipboard() {
    const snapshotLink = this.constructSnapshotLink();
    
    if (!snapshotLink) {
      console.error('Failed to construct snapshot link');
      return false;
    }
    
    this.state.snapshotLink = snapshotLink;
    
    try {
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(snapshotLink);
        this._showToast('Snapshot link copied to clipboard!');
        return true;
      } else {
        // Fallback: show modal for manual copy
        this._showSnapshotLinkModal(snapshotLink);
        return false;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show modal for manual copy
      this._showSnapshotLinkModal(snapshotLink);
      return false;
    }
  }
  
  /**
   * Restore map state from snapshot link URL
   * @param {string} url - Snapshot URL with encoded state
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async restoreFromSnapshotLink(url) {
    try {
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      
      // Restore viewport
      const centerParam = params.get('center');
      const zoomParam = params.get('zoom');
      
      if (centerParam && zoomParam) {
        const [lat, lng] = centerParam.split(',').map(Number);
        const zoom = parseFloat(zoomParam);
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
          this.dispatchMap.map.flyTo({
            center: [lng, lat],
            zoom: zoom
          });
        }
      }
      
      // Restore filters
      const filters = this.dispatchMap.state.ui.filters;
      if (params.get('filter_unassigned') === 'true') filters.unassignedOnly = true;
      if (params.get('filter_assigned_not_picked') === 'true') filters.assignedNotPickedUp = true;
      if (params.get('filter_late') === 'true') filters.lateDeliveries = true;
      if (params.get('filter_cod') === 'true') filters.cashOnDelivery = true;
      if (params.get('filter_merchant')) filters.merchantId = params.get('filter_merchant');
      if (params.get('filter_hide_approx') === 'true') filters.hideApproximate = true;
      
      // Restore visible orders
      const visibleOrderIds = params.get('visible_orders');
      if (visibleOrderIds) {
        // Highlight orders (implementation depends on existing order highlighting)
        console.log('Restoring visible orders:', visibleOrderIds);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to restore from snapshot link:', error);
      return false;
    }
  }
  
  /**
   * Get visible orders based on current filters
   * @returns {Array} Array of visible order objects
   * @private
   */
  _getVisibleOrders() {
    const { orders } = this.dispatchMap.state.data;
    const filters = this.dispatchMap.state.ui.filters;
    
    // Apply filters
    return orders.filter(order => {
      // Unassigned only
      if (filters.unassignedOnly && order.driverId) {
        return false;
      }
      
      // Assigned but not picked up
      if (filters.assignedNotPickedUp && 
          (order.driverId && ['picked_up', 'delivered'].includes(order.status))) {
        return false;
      }
      
      // Late deliveries
      if (filters.lateDeliveries) {
        // Implementation depends on how lateness is calculated
        return true; // Placeholder
      }
      
      // Cash on delivery
      if (filters.cashOnDelivery && order.paymentType !== 'cash') {
        return false;
      }
      
      // Specific merchant
      if (filters.merchantId && order.merchantId !== filters.merchantId) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get driver name by ID
   * @param {string} driverId - Driver ID
   * @returns {string} Driver name or 'Unknown'
   * @private
   */
  _getDriverName(driverId) {
    const driver = this.dispatchMap.state.data.drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown';
  }
  
  /**
   * Get merchant name by ID
   * @param {string} merchantId - Merchant ID
   * @returns {string} Merchant name or 'Unknown'
   * @private
   */
  _getMerchantName(merchantId) {
    const merchant = this.dispatchMap.state.data.merchants.find(m => m.id === merchantId);
    return merchant ? merchant.name : 'Unknown';
  }
  
  /**
   * Format currency value
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   * @private
   */
  _formatCurrency(amount) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(amount);
  }
  
  /**
   * Escape CSV field value
   * @param {string} value - Value to escape
   * @returns {string} Escaped CSV field
   * @private
   */
  _escapeCSVField(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const str = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  }
  
  /**
   * Get today's date as YYYY-MM-DD string
   * @returns {string} Date string
   * @private
   */
  _getTodayDateString() {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @private
   */
  _showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: #fff;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // Add to DOM and remove after 3 seconds
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  /**
   * Show snapshot link modal for manual copy
   * @param {string} snapshotLink - Snapshot link to display
   * @private
   */
  _showSnapshotLinkModal(snapshotLink) {
    // Create modal element
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: #fff;
      padding: 24px;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
    `;
    
    content.innerHTML = `
      <h3 style="margin-top: 0;">Snapshot Link</h3>
      <p>Copy this link to share the current map state:</p>
      <textarea style="width: 100%; height: 80px; margin: 12px 0; padding: 8px; font-family: monospace; font-size: 12px;" readonly>${snapshotLink}</textarea>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button id="copyBtn" style="padding: 8px 16px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
        <button id="closeBtn" style="padding: 8px 16px; background: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    const copyBtn = modal.querySelector('#copyBtn');
    const closeBtn = modal.querySelector('#closeBtn');
    
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(snapshotLink).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          modal.remove();
        }, 1500);
      }).catch(() => {
        copyBtn.textContent = 'Failed';
        setTimeout(() => copyBtn.textContent = 'Copy', 1500);
      });
    });
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}
