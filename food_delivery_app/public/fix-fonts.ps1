$files = @("home.html", "main.html", "customer.html", "discovery.html", "supabase.html", "cart.html", "product.html", "index_marketplace.html")
foreach ($f in $files) {
  $c = Get-Content $f -Raw
  $c = $c -replace 'media="print" onload="this\.media=\'all\'"', ''
  Set-Content $f $c
}
"Done"