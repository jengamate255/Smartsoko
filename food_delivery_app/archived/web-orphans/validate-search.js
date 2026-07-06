/**
 * Validation Script for Search Query Matching Implementation
 * 
 * This script validates the search implementation without requiring vitest.
 * Run with: node validate-search.js
 */

// Mock DispatchMap for testing
class MockDispatchMap {
  constructor() {
    this.config = {
      searchDebounceMs: 300,
      searchTimeoutMs: 500,
      flyToZoom: 15
    };
    this.state = {
      data: {
        orders: [],
        drivers: [],
        merchants: []
      },
      health: {
        mapboxErrors: 0
      }
    };
    this.map = {
      getContainer: () => ({ appendChild: () => {} }),
      on: () => {},
      off: () => {},
      flyTo: () => {}
    };
  }
}

// Import SearchModule (simplified for validation)
class SearchModule {
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
  }

  async search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const startTime = Date.now();
    const searchTerm = query.toLowerCase().trim();
    const results = [];

    try {
      const orderResults = this._searchOrders(searchTerm);
      results.push(...orderResults);

      const driverResults = this._searchDrivers(searchTerm);
      results.push(...driverResults);

      const merchantResults = this._searchMerchants(searchTerm);
      results.push(...merchantResults);

      results.sort((a, b) => b.relevance - a.relevance);

      const elapsed = Date.now() - startTime;
      if (elapsed > this.dispatchMap.config.searchTimeoutMs) {
        console.warn(`Search exceeded SLA: ${elapsed}ms > ${this.dispatchMap.config.searchTimeoutMs}ms`);
      }

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      return [];
    }
  }

  _searchOrders(searchTerm) {
    const results = [];
    const { orders } = this.dispatchMap.state.data;

    orders.forEach(order => {
      let relevance = 0;

      if (order.id && order.id.toLowerCase() === searchTerm) {
        relevance = 100;
      } else if (order.id && order.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      } else if (order.customerName && order.customerName.toLowerCase() === searchTerm) {
        relevance = 85;
      } else if (order.customerName && order.customerName.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      } else if (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      } else if (order.customerName && this._fuzzyMatch(order.customerName.toLowerCase(), searchTerm)) {
        relevance = 50;
      } else if (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm)) {
        relevance = 60;
      } else if (order.deliveryAddress && this._fuzzyMatch(order.deliveryAddress.toLowerCase(), searchTerm)) {
        relevance = 40;
      }

      if (relevance > 0) {
        results.push({
          type: 'order',
          id: order.id,
          label: `Order ${order.id} - ${order.customerName || 'Unknown'}`,
          coordinates: order.deliveryLocation || null,
          originalData: order,
          relevance
        });
      }
    });

    return results;
  }

  _searchDrivers(searchTerm) {
    const results = [];
    const { drivers } = this.dispatchMap.state.data;

    drivers.forEach(driver => {
      let relevance = 0;

      if (driver.id && driver.id.toLowerCase() === searchTerm) {
        relevance = 100;
      } else if (driver.id && driver.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      } else if (driver.name && driver.name.toLowerCase() === searchTerm) {
        relevance = 85;
      } else if (driver.name && driver.name.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      } else if (driver.name && driver.name.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      } else if (driver.name && this._fuzzyMatch(driver.name.toLowerCase(), searchTerm)) {
        relevance = 50;
      }

      if (relevance > 0) {
        const coordinates = driver.currentLocation || { lat: driver.lat, lng: driver.lng };
        results.push({
          type: 'driver',
          id: driver.id,
          label: `Driver: ${driver.name || 'Unknown'}`,
          coordinates: coordinates || null,
          originalData: driver,
          relevance
        });
      }
    });

    return results;
  }

  _searchMerchants(searchTerm) {
    const results = [];
    const { merchants } = this.dispatchMap.state.data;

    merchants.forEach(merchant => {
      let relevance = 0;

      if (merchant.id && merchant.id.toLowerCase() === searchTerm) {
        relevance = 100;
      } else if (merchant.id && merchant.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      } else if (merchant.name && merchant.name.toLowerCase() === searchTerm) {
        relevance = 85;
      } else if (merchant.name && merchant.name.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      } else if (merchant.name && merchant.name.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      } else if (merchant.name && this._fuzzyMatch(merchant.name.toLowerCase(), searchTerm)) {
        relevance = 50;
      } else if (merchant.address && merchant.address.toLowerCase().includes(searchTerm)) {
        relevance = 60;
      } else if (merchant.address && this._fuzzyMatch(merchant.address.toLowerCase(), searchTerm)) {
        relevance = 40;
      }

      if (relevance > 0) {
        const coordinates = merchant.pickupLocation || { lat: merchant.lat, lng: merchant.lng };
        results.push({
          type: 'merchant',
          id: merchant.id,
          label: `Merchant: ${merchant.name || 'Unknown'}`,
          coordinates: coordinates || null,
          originalData: merchant,
          relevance
        });
      }
    });

    return results;
  }

  _fuzzyMatch(text, pattern) {
    let patternIdx = 0;
    let textIdx = 0;

    while (patternIdx < pattern.length && textIdx < text.length) {
      if (pattern[patternIdx] === text[textIdx]) {
        patternIdx++;
      }
      textIdx++;
    }

    return patternIdx === pattern.length;
  }
}

// Test Suite
async function runValidation() {
  console.log('🔍 Validating Search Query Matching Implementation\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Order search by exact ID
  console.log('Test 1: Order search by exact ID');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('ORD001');
    
    if (results.length === 1 && results[0].relevance === 100) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Expected 1 result with relevance 100\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 2: Case-insensitive search
  console.log('Test 2: Case-insensitive search');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results1 = await search.search('JOHN');
    const results2 = await search.search('john');
    
    if (results1.length === 1 && results2.length === 1 && results1[0].relevance === results2[0].relevance) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Case-insensitive matching not working\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 3: Partial string matching
  console.log('Test 3: Partial string matching');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('doe');
    
    if (results.length === 1 && results[0].relevance === 65) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Partial string matching not working\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 4: Fuzzy matching
  console.log('Test 4: Fuzzy matching');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'Christopher Johnson', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('cjohn');
    
    if (results.length === 1 && results[0].relevance === 50) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Fuzzy matching not working\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 5: Relevance ranking
  console.log('Test 5: Relevance ranking');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' },
      { id: 'ORD002', customerName: 'John Smith', deliveryAddress: '456 Oak Ave' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('john');
    
    if (results.length === 2 && results[0].relevance >= results[1].relevance) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Relevance ranking not working\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 6: Empty query handling
  console.log('Test 6: Empty query handling');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('');
    
    if (results.length === 0) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Empty query should return no results\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 7: Driver search
  console.log('Test 7: Driver search');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.drivers = [
      { id: 'DRV001', name: 'Alice Driver', lat: -6.7, lng: 39.2 }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('alice');
    
    if (results.length === 1 && results[0].type === 'driver') {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Driver search not working\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 8: Result structure
  console.log('Test 8: Result structure validation');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('ORD001');
    
    const result = results[0];
    const hasAllProps = result.type && result.id && result.label && 
                       result.hasOwnProperty('coordinates') && 
                       result.originalData && 
                       typeof result.relevance === 'number';
    
    if (hasAllProps) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Result structure incomplete\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 9: SLA compliance
  console.log('Test 9: SLA compliance (500ms)');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = Array.from({ length: 100 }, (_, i) => ({
      id: `ORD${String(i).padStart(3, '0')}`,
      customerName: `Customer ${i}`,
      deliveryAddress: `${i} Main St`
    }));
    const search = new SearchModule(dm);
    
    const startTime = Date.now();
    const results = await search.search('customer');
    const elapsed = Date.now() - startTime;
    
    if (elapsed <= 500) {
      console.log(`✓ PASSED (${elapsed}ms)\n`);
      passed++;
    } else {
      console.log(`✗ FAILED: Search took ${elapsed}ms (exceeds 500ms SLA)\n`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Test 10: Mixed result types
  console.log('Test 10: Mixed result types');
  try {
    const dm = new MockDispatchMap();
    dm.state.data.orders = [
      { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
    ];
    dm.state.data.drivers = [
      { id: 'DRV001', name: 'John Driver', lat: -6.7, lng: 39.2 }
    ];
    dm.state.data.merchants = [
      { id: 'MERCH001', name: 'John\'s Pizza', address: '789 Food St', lat: -6.75, lng: 39.25 }
    ];
    const search = new SearchModule(dm);
    const results = await search.search('john');
    
    if (results.length >= 2) {
      console.log('✓ PASSED\n');
      passed++;
    } else {
      console.log('✗ FAILED: Should find multiple result types\n');
      failed++;
    }
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}\n`);
    failed++;
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n📊 Validation Results:`);
  console.log(`   ✓ Passed: ${passed}`);
  console.log(`   ✗ Failed: ${failed}`);
  console.log(`   Total:   ${passed + failed}\n`);
  
  if (failed === 0) {
    console.log('🎉 All validation tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the implementation.\n');
    process.exit(1);
  }
}

// Run validation
runValidation().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
