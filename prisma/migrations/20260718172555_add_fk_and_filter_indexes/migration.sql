-- CreateIndex
CREATE INDEX "CustomerPrice_productId_idx" ON "CustomerPrice"("productId");

-- CreateIndex
CREATE INDEX "DispatchEntry_customerId_idx" ON "DispatchEntry"("customerId");

-- CreateIndex
CREATE INDEX "DispatchEntry_date_idx" ON "DispatchEntry"("date");

-- CreateIndex
CREATE INDEX "DispatchEntry_status_idx" ON "DispatchEntry"("status");

-- CreateIndex
CREATE INDEX "DispatchEntry_isCancelled_idx" ON "DispatchEntry"("isCancelled");

-- CreateIndex
CREATE INDEX "DispatchEntryItem_dispatchEntryId_idx" ON "DispatchEntryItem"("dispatchEntryId");

-- CreateIndex
CREATE INDEX "DispatchEntryItem_productId_idx" ON "DispatchEntryItem"("productId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_date_idx" ON "Invoice"("date");

-- CreateIndex
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_mode_idx" ON "Payment"("mode");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_idx" ON "PaymentAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_batchId_idx" ON "PaymentAllocation"("batchId");

-- CreateIndex
CREATE INDEX "PriceHistory_customerId_idx" ON "PriceHistory"("customerId");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_idx" ON "PriceHistory"("productId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Purchase_vendorId_idx" ON "Purchase"("vendorId");

-- CreateIndex
CREATE INDEX "Purchase_date_idx" ON "Purchase"("date");

-- CreateIndex
CREATE INDEX "Purchase_paymentStatus_idx" ON "Purchase"("paymentStatus");

-- CreateIndex
CREATE INDEX "Purchase_isCancelled_idx" ON "Purchase"("isCancelled");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "StockTransaction_productId_idx" ON "StockTransaction"("productId");

-- CreateIndex
CREATE INDEX "StockTransaction_purchaseId_idx" ON "StockTransaction"("purchaseId");

-- CreateIndex
CREATE INDEX "StockTransaction_dispatchEntryId_idx" ON "StockTransaction"("dispatchEntryId");

-- CreateIndex
CREATE INDEX "StockTransaction_performedById_idx" ON "StockTransaction"("performedById");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorId_idx" ON "VendorPayment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayment_purchaseId_idx" ON "VendorPayment"("purchaseId");

-- CreateIndex
CREATE INDEX "VendorProduct_productId_idx" ON "VendorProduct"("productId");
