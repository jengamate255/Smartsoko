#!/bin/bash
# SmartSoko Performance Testing - Linux/macOS Runner
# Usage: ./run-performance.sh [test-type] [options]

set -euo pipefail

# Colors
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

# Default values
TEST_TYPE="all"
BASE_URL="http://localhost:3000"
FIREBASE_API_KEY="AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE"
PESAPAL_ENV="sandbox"
GENERATE_DATA=false
USERS=1000000
PRODUCTS=500000
ORDERS=5000000

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --test-type|-t)
            TEST_TYPE="$2"
            shift 2
            ;;
        --base-url|-u)
            BASE_URL="$2"
            shift 2
            ;;
        --firebase-key|-k)
            FIREBASE_API_KEY="$2"
            shift 2
            ;;
        --pesapal-env|-p)
            PESAPAL_ENV="$2"
            shift 2
            ;;
        --generate-data|-g)
            GENERATE_DATA=true
            shift
            ;;
        --users)
            USERS="$2"
            shift 2
            ;;
        --products)
            PRODUCTS="$2"
            shift 2
            ;;
        --orders)
            ORDERS="$2"
            shift 2
            ;;
        --help|-h)
            cat << EOF
SmartSoko Performance Testing Framework

Usage: $0 [OPTIONS]

Options:
  --test-type, -t TYPE       Test to run: all, auth, product, search, cart, 
                             checkout, payment, merchant, order, soak, spike, datagen
  --base-url, -u URL         SmartSoko API base URL (default: http://localhost:3000)
  --firebase-key, -k KEY     Firebase Web API Key
  --pesapal-env, -p ENV      PesaPal environment: sandbox/live (default: sandbox)
  --generate-data, -g        Generate test data before running tests
  --users N                  Number of users to generate (default: 1000000)
  --products N               Number of products to generate (default: 500000)
  --orders N                 Number of orders to generate (default: 5000000)
  --help, -h                 Show this help

Examples:
  $0                          # Run all tests
  $0 -t auth                  # Run only auth tests
  $0 -g --users 100000        # Generate data then run all tests
  $0 -t soak                  # Run 24-hour soak test
EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Helper functions
write_header() {
    echo -e "\n${CYAN}===========================================${RESET}"
    echo -e "${CYAN}  $1${RESET}"
    echo -e "${CYAN}===========================================${RESET}\n"
}

write_success() {
    echo -e "${GREEN}✓ $1${RESET}"
}

write_error() {
    echo -e "${RED}✗ $1${RESET}"
}

write_warning() {
    echo -e "${YELLOW}⚠ $1${RESET}"
}

check_docker() {
    write_header "Checking Docker"
    if ! command -v docker &> /dev/null; then
        write_error "Docker not found. Please install Docker."
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        write_error "Docker Compose not found."
        exit 1
    fi
    write_success "Docker and Docker Compose found"
}

check_environment() {
    write_header "Checking Environment Variables"
    local missing=()
    
    if [[ -z "${FIREBASE_SERVICE_ACCOUNT_BASE64:-}" ]]; then
        missing+=("FIREBASE_SERVICE_ACCOUNT_BASE64")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        write_warning "Missing environment variables: ${missing[*]}"
        write_warning "Some tests may not work without Firebase credentials"
    else
        write_success "All required environment variables set"
    fi
}

start_infrastructure() {
    write_header "Starting Infrastructure"
    
    if [[ ! -f "docker-compose.yml" ]]; then
        write_error "docker-compose.yml not found"
        exit 1
    fi
    
    echo "Starting Prometheus, Grafana, Redis, InfluxDB..."
    docker-compose up -d prometheus grafana redis influxdb telegraf
    
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check Prometheus
    local prometheus_ready=false
    for i in {1..30}; do
        if curl -sf "http://localhost:9090/-/ready" > /dev/null 2>&1; then
            prometheus_ready=true
            break
        fi
        sleep 2
    done
    
    if [[ "$prometheus_ready" == "true" ]]; then
        write_success "Prometheus ready at http://localhost:9090"
    else
        write_warning "Prometheus may not be fully ready"
    fi
    
    # Check Grafana
    local grafana_ready=false
    for i in {1..30}; do
        if curl -sf "http://localhost:3001/api/health" > /dev/null 2>&1; then
            grafana_ready=true
            break
        fi
        sleep 2
    done
    
    if [[ "$grafana_ready" == "true" ]]; then
        write_success "Grafana ready at http://localhost:3001 (admin/admin)"
    else
        write_warning "Grafana may not be fully ready"
    fi
}

start_smartsoko_app() {
    write_header "Starting SmartSoko Application"
    
    docker-compose up -d smartsoko-app
    
    echo "Waiting for SmartSoko app to be ready..."
    local app_ready=false
    for i in {1..60}; do
        if curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
            app_ready=true
            break
        fi
        sleep 3
    done
    
    if [[ "$app_ready" == "true" ]]; then
        write_success "SmartSoko app ready at ${BASE_URL}"
    else
        write_error "SmartSoko app failed to start"
        docker-compose logs smartsoko-app
        exit 1
    fi
}

run_data_generation() {
    write_header "Generating Test Data"
    
    docker-compose run --rm datagen node /datagen/generate-data.js \
        --users "${USERS}" \
        --products "${PRODUCTS}" \
        --orders "${ORDERS}"
    
    if [[ $? -eq 0 ]]; then
        write_success "Test data generation complete"
    else
        write_error "Test data generation failed"
        exit 1
    fi
}

run_k6_test() {
    local test_name="$1"
    local script_path="$2"
    local -n env_vars_ref=$3
    
    write_header "Running ${test_name} Test"
    
    # Build env args
    local env_args=(
        -e "BASE_URL=${BASE_URL}"
        -e "FIREBASE_API_KEY=${FIREBASE_API_KEY}"
        -e "PESAPAL_ENV=${PESAPAL_ENV}"
    )
    
    for key in "${!env_vars_ref[@]}"; do
        env_args+=(-e "${key}=${env_vars_ref[$key]}")
    done
    
    docker-compose run --rm "${env_args[@]}" k6 run "${script_path}"
    
    if [[ $? -eq 0 ]]; then
        write_success "${test_name} test completed successfully"
        return 0
    else
        write_error "${test_name} test failed"
        return 1
    fi
}

run_all_tests() {
    write_header "Running All Performance Tests"
    
    local results=()
    local tests=(
        "Auth|/scripts/auth-test.js"
        "Product Browse|/scripts/product-test.js"
        "Search|/scripts/search-test.js"
        "Cart|/scripts/cart-test.js"
        "Checkout|/scripts/checkout-test.js"
        "Payment|/scripts/payment-test.js"
        "Merchant Dashboard|/scripts/merchant-test.js"
        "Order Processing|/scripts/order-test.js"
    )
    
    for test in "${tests[@]}"; do
        IFS='|' read -r name script <<< "$test"
        declare -a empty_env=()
        if run_k6_test "${name}" "${script}" empty_env; then
            results+=("${name}:PASS")
        else
            results+=("${name}:FAIL")
        fi
    done
    
    write_header "Test Results Summary"
    local failed=0
    for result in "${results[@]}"; do
        IFS=':' read -r name status <<< "$result"
        if [[ "$status" == "PASS" ]]; then
            echo -e "  ${name}: ${GREEN}PASS${RESET}"
        else
            echo -e "  ${name}: ${RED}FAIL${RESET}"
            ((failed++))
        fi
    done
    
    if [[ $failed -gt 0 ]]; then
        write_error "${failed} test(s) failed"
        exit 1
    fi
    
    write_success "All tests passed!"
}

# Main execution
echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║     SmartSoko Performance Testing Framework             ║${RESET}"
echo -e "${CYAN}║     Test Type: ${TEST_TYPE}$(printf '%*s' $((47 - ${#TEST_TYPE})) '')║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n"

# Change to performance directory
cd "$(dirname "$0")/.."

check_docker
check_environment

if [[ "$GENERATE_DATA" == "true" || "$TEST_TYPE" == "datagen" ]]; then
    start_infrastructure
    start_smartsoko_app
    run_data_generation
    if [[ "$TEST_TYPE" == "datagen" ]]; then
        exit 0
    fi
fi

start_infrastructure
start_smartsoko_app

case "$TEST_TYPE" in
    all)
        run_all_tests
        ;;
    auth)
        declare -a empty_env=()
        run_k6_test "Auth" "/scripts/auth-test.js" empty_env
        ;;
    product)
        declare -a empty_env=()
        run_k6_test "Product Browse" "/scripts/product-test.js" empty_env
        ;;
    search)
        declare -a empty_env=()
        run_k6_test "Search" "/scripts/search-test.js" empty_env
        ;;
    cart)
        declare -a empty_env=()
        run_k6_test "Cart" "/scripts/cart-test.js" empty_env
        ;;
    checkout)
        declare -a empty_env=()
        run_k6_test "Checkout" "/scripts/checkout-test.js" empty_env
        ;;
    payment)
        declare -a empty_env=()
        run_k6_test "Payment" "/scripts/payment-test.js" empty_env
        ;;
    merchant)
        declare -a empty_env=()
        run_k6_test "Merchant Dashboard" "/scripts/merchant-test.js" empty_env
        ;;
    order)
        declare -a empty_env=()
        run_k6_test "Order Processing" "/scripts/order-test.js" empty_env
        ;;
    soak)
        declare -a soak_env=(["SOAK_DURATION"]="24h")
        run_k6_test "Soak" "/scripts/soak-test.js" soak_env
        ;;
    spike)
        declare -a empty_env=()
        run_k6_test "Spike" "/scripts/spike-test.js" empty_env
        ;;
    *)
        write_error "Unknown test type: $TEST_TYPE"
        exit 1
        ;;
esac

write_header "Performance Testing Complete"
echo "View results in:"
echo "  - Grafana: http://localhost:3001 (admin/admin)"
echo "  - Prometheus: http://localhost:9090"
echo "  - Reports: ./reports/"
echo ""