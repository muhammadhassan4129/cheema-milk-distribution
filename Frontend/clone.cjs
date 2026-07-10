const fs = require('fs');
let content = fs.readFileSync('src/screens/accountant/SaleLedger.tsx', 'utf8');

// String replacements to convert SaleLedger to PurchaseLedger
content = content.replace(/SaleLedger/g, 'PurchaseLedger');
content = content.replace(/CustomerProfile/g, 'SupplierProfile');
content = content.replace(/customerProfiles/g, 'supplierProfiles');
content = content.replace(/setCustomerProfiles/g, 'setSupplierProfiles');
content = content.replace(/Customer/g, 'Supplier');
content = content.replace(/customer/g, 'supplier');
content = content.replace(/SaleEntry/g, 'PurchaseEntry');
content = content.replace(/Sale/g, 'Purchase');
content = content.replace(/sale/g, 'purchase');
content = content.replace(/Sold/g, 'Purchased');
content = content.replace(/SOLD/g, 'PURCHASED');
content = content.replace(/cheema_purchase_profiles/g, 'cheema_supplier_profiles');
content = content.replace(/milk_sale/g, 'milk_purchase');
content = content.replace(/Total System Outstanding/g, 'Total System Advance');
content = content.replace(/System Balance/g, 'System Advance');
content = content.replace(/Outstanding Balance/g, 'Advance Balance');
content = content.replace(/Total System Balance/g, 'Total System Advance');

// Adjust balance formulas internally if needed
// For Sale: Prev + Milk - Advance - Cash
// For Purchase: we want to track Advance. So: Prev + Advance + Cash - MilkPurchased?
// Let's modify the formula manually after this structural clone.

fs.writeFileSync('src/screens/accountant/PurchaseLedger.tsx', content);
console.log('Done cloning');
