param(
    [string]$FirestoreUrl = "http://localhost:8080/v1/projects/fooddelievry-dce15/databases/(default)/documents",
    [string]$AuthUrl = "http://localhost:9099/identitytoolkit.googleapis.com/v1"
)

Write-Output "=== Step 1: Create/ensure Auth users ==="

$emails = @(
    @{ email = "pipsr101@gmail.com"; password = "Tanzania101" },
    @{ email = "driver@test.com"; password = "Test123" },
    @{ email = "customer@test.com"; password = "Test123" }
)

$uids = @{}
foreach ($u in $emails) {
    try {
        $resp = Invoke-RestMethod -Uri "$AuthUrl/accounts:signUp?key=fake" -Method Post `
            -Body ($u | ConvertTo-Json -Compress) -ContentType "application/json" -ErrorAction Stop
        Write-Output "  Created $($u.email) -> $($resp.localId)"
        $uids[$u.email] = $resp.localId
    } catch {
        # User may already exist - sign in to get UID
        try {
            $resp = Invoke-RestMethod -Uri "$AuthUrl/accounts:signInWithPassword?key=fake" -Method Post `
                -Body ($u | ConvertTo-Json -Compress) -ContentType "application/json" -ErrorAction Stop
            Write-Output "  Found $($u.email) -> $($resp.localId)"
            $uids[$u.email] = $resp.localId
        } catch {
            Write-Output "  FAILED $($u.email): $_"
        }
    }
}

$merchantUid = $uids["pipsr101@gmail.com"]
$driverUid = $uids["driver@test.com"]
$customerUid = $uids["customer@test.com"]

Write-Output "Auth UIDs: merchant=$merchantUid driver=$driverUid customer=$customerUid"

# Sign in to get tokens for each role
Write-Output "`n=== Step 2: Sign in for auth tokens ==="
$r = Invoke-RestMethod -Uri "$AuthUrl/accounts:signInWithPassword?key=fake" -Method Post -Body '{"email":"pipsr101@gmail.com","password":"Tanzania101","returnSecureToken":true}' -ContentType "application/json"
$merchantToken = $r.idToken
$merchantHeaders = @{ Authorization = "Bearer $merchantToken" }

$r = Invoke-RestMethod -Uri "$AuthUrl/accounts:signInWithPassword?key=fake" -Method Post -Body '{"email":"driver@test.com","password":"Test123","returnSecureToken":true}' -ContentType "application/json"
$driverToken = $r.idToken
$driverHeaders = @{ Authorization = "Bearer $driverToken" }

$r = Invoke-RestMethod -Uri "$AuthUrl/accounts:signInWithPassword?key=fake" -Method Post -Body '{"email":"customer@test.com","password":"Test123","returnSecureToken":true}' -ContentType "application/json"
$customerToken = $r.idToken
$customerHeaders = @{ Authorization = "Bearer $customerToken" }

function Create-Doc($collection, $docId, $fields, $headers) {
    $body = @{ fields = $fields } | ConvertTo-Json -Depth 10 -Compress
    $url = "$FirestoreUrl/$collection`?documentId=$docId"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -Headers $headers -ErrorAction Stop
        Write-Output "  OK $collection/$docId"
        return $true
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Output "  EXISTS $collection/$docId"
            return $true  # Already exists is fine
        }
        Write-Output "  FAIL $collection/$docId : $($_.Exception.Response.StatusCode) $($_.Exception.Message)"
        return $false
    }
}

Write-Output "`n=== Step 3: Create Firestore documents ==="

$sellerId = "testSeller001"
$driverDocId = "testDriver001"
$customerDocId = "testCustomer001"

Create-Doc "sellers" $sellerId @{
    ownerId = @{ stringValue = $merchantUid }
    name = @{ stringValue = "Test Merchant" }
    description = @{ stringValue = "A test restaurant serving delicious food" }
    category = @{ stringValue = "Restaurant" }
    address = @{ stringValue = "123 Test Street, Dar es Salaam" }
    phone = @{ stringValue = "+255712345678" }
    email = @{ stringValue = "pipsr101@gmail.com" }
    imageUrl = @{ stringValue = "" }
    isOpen = @{ booleanValue = $true }
    rating = @{ doubleValue = 4.5 }
    reviewCount = @{ integerValue = 42 }
    deliveryFee = @{ doubleValue = 2000.0 }
    minOrderAmount = @{ doubleValue = 5000.0 }
    deliveryTime = @{ stringValue = "30-45 min" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "drivers" $driverDocId @{
    ownerId = @{ stringValue = $driverUid }
    name = @{ stringValue = "Test Driver" }
    email = @{ stringValue = "driver@test.com" }
    phone = @{ stringValue = "+255712345679" }
    vehicleType = @{ stringValue = "Motorcycle" }
    vehiclePlate = @{ stringValue = "T123ABC" }
    isOnline = @{ booleanValue = $true }
    status = @{ stringValue = "ONLINE" }
    rating = @{ doubleValue = 4.8 }
    reviewCount = @{ integerValue = 27 }
    currentLatitude = @{ doubleValue = -6.7924 }
    currentLongitude = @{ doubleValue = 39.2083 }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $driverHeaders

Create-Doc "customers" $customerDocId @{
    ownerId = @{ stringValue = $customerUid }
    name = @{ stringValue = "Test Customer" }
    email = @{ stringValue = "customer@test.com" }
    phone = @{ stringValue = "+255712345680" }
    address = @{ stringValue = "456 Main Road, Dar es Salaam" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $customerHeaders

Create-Doc "products" "prod001" @{
    merchantId = @{ stringValue = $sellerId }
    name = @{ stringValue = "Chicken Biryani" }
    description = @{ stringValue = "Fragrant biryani with tender chicken pieces" }
    price = @{ doubleValue = 12000.0 }
    originalPrice = @{ doubleValue = 15000.0 }
    imageUrl = @{ stringValue = "" }
    category = @{ stringValue = "Main Course" }
    available = @{ booleanValue = $true }
    featured = @{ booleanValue = $true }
    stockQuantity = @{ integerValue = 50 }
    unit = @{ stringValue = "item" }
    rating = @{ doubleValue = 4.7 }
    reviewCount = @{ integerValue = 18 }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "products" "prod002" @{
    merchantId = @{ stringValue = $sellerId }
    name = @{ stringValue = "Beef Pilau" }
    description = @{ stringValue = "Spiced rice with tender beef chunks" }
    price = @{ doubleValue = 10000.0 }
    imageUrl = @{ stringValue = "" }
    category = @{ stringValue = "Main Course" }
    available = @{ booleanValue = $true }
    stockQuantity = @{ integerValue = 40 }
    unit = @{ stringValue = "item" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "products" "prod003" @{
    merchantId = @{ stringValue = $sellerId }
    name = @{ stringValue = "Samaki Fry" }
    description = @{ stringValue = "Crispy fried fish with ugali and kachumbari" }
    price = @{ doubleValue = 8000.0 }
    imageUrl = @{ stringValue = "" }
    category = @{ stringValue = "Main Course" }
    available = @{ booleanValue = $true }
    stockQuantity = @{ integerValue = 30 }
    unit = @{ stringValue = "item" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "products" "prod004" @{
    merchantId = @{ stringValue = $sellerId }
    name = @{ stringValue = "Mango Juice" }
    description = @{ stringValue = "Freshly squeezed mango juice" }
    price = @{ doubleValue = 3000.0 }
    imageUrl = @{ stringValue = "" }
    category = @{ stringValue = "Beverages" }
    available = @{ booleanValue = $true }
    stockQuantity = @{ integerValue = 100 }
    unit = @{ stringValue = "item" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "products" "prod005" @{
    merchantId = @{ stringValue = $sellerId }
    name = @{ stringValue = "Chips Mayai" }
    description = @{ stringValue = "Classic Tanzanian chips omelette" }
    price = @{ doubleValue = 5000.0 }
    imageUrl = @{ stringValue = "" }
    category = @{ stringValue = "Snacks" }
    available = @{ booleanValue = $true }
    stockQuantity = @{ integerValue = 60 }
    unit = @{ stringValue = "item" }
    createdAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T00:00:00Z" }
} $merchantHeaders

Create-Doc "orders" "order001" @{
    customerId = @{ stringValue = $customerDocId }
    customerName = @{ stringValue = "Test Customer" }
    customerPhone = @{ stringValue = "+255712345680" }
    sellerId = @{ stringValue = $sellerId }
    sellerName = @{ stringValue = "Test Merchant" }
    items = @{ arrayValue = @{
        values = @(
            @{ mapValue = @{ fields = @{
                productId = @{ stringValue = "prod001" }
                name = @{ stringValue = "Chicken Biryani" }
                quantity = @{ integerValue = 2 }
                price = @{ doubleValue = 12000.0 }
                imageUrl = @{ stringValue = "" }
            }}}
            @{ mapValue = @{ fields = @{
                productId = @{ stringValue = "prod004" }
                name = @{ stringValue = "Mango Juice" }
                quantity = @{ integerValue = 1 }
                price = @{ doubleValue = 3000.0 }
                imageUrl = @{ stringValue = "" }
            }}}
        )
    }}
    totalAmount = @{ doubleValue = 27000.0 }
    deliveryFee = @{ doubleValue = 2000.0 }
    status = @{ stringValue = "pending" }
    paymentMethod = @{ stringValue = "Cash" }
    paymentStatus = @{ stringValue = "pending" }
    deliveryAddress = @{ stringValue = "456 Main Road, Dar es Salaam" }
    deliveryNotes = @{ stringValue = "Call upon arrival" }
    driverId = @{ stringValue = "" }
    driverName = @{ stringValue = "" }
    createdAt = @{ timestampValue = "2026-07-17T20:00:00Z" }
    updatedAt = @{ timestampValue = "2026-07-17T20:00:00Z" }
} $customerHeaders

Write-Output "`n=== ALL DONE ==="
Write-Output "Merchant: $merchantUid (pipsr101@gmail.com) -> sellers/$sellerId"
Write-Output "Driver:   $driverUid (driver@test.com) -> drivers/$driverDocId"
Write-Output "Customer: $customerUid (customer@test.com) -> customers/$customerDocId"
Write-Output "Products: prod001-005"
Write-Output "Order:    order001 (pending)"
