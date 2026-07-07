import React from 'react';
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { format } from 'date-fns';

export interface InvoiceSnapshotCompany {
  name: string;
  address: string;
  state: string;
  gstin: string;
  pan: string | null;
}

export interface InvoiceSnapshotCustomer {
  firmName: string;
  address: string;
  city: string;
  state: string;
  gstin: string | null;
}

export interface InvoiceSnapshotInvoice {
  invoiceNo: string;
  date: string;
  place: string;
  transport: string | null;
}

export interface InvoiceSnapshotDispatchReference {
  challanNo: string;
  dispatchDate: string;
}

export interface InvoiceSnapshotItem {
  productName: string;
  categoryName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  price: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface InvoiceSnapshotTotals {
  totalAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
}

export interface InvoiceSnapshot {
  company: InvoiceSnapshotCompany;
  customer: InvoiceSnapshotCustomer;
  invoice: InvoiceSnapshotInvoice;
  dispatchReference: InvoiceSnapshotDispatchReference;
  items: InvoiceSnapshotItem[];
  totals: InvoiceSnapshotTotals;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  small: {
    fontSize: 8,
    color: '#444444',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginVertical: 10,
    letterSpacing: 1,
  },
  headerBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 8,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaCol: {
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
  },
  billTo: {
    borderWidth: 1,
    borderColor: '#cccccc',
    padding: 6,
    marginBottom: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
  },
  cellProduct: { width: '22%' },
  cellHsn: { width: '10%' },
  cellQty: { width: '9%', textAlign: 'right' },
  cellUnit: { width: '8%' },
  cellPrice: { width: '11%', textAlign: 'right' },
  cellGst: { width: '11%', textAlign: 'right' },
  cellTotal: { width: '12%', textAlign: 'right', borderRightWidth: 0 },
  totalsBlock: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    fontSize: 8,
    color: '#444444',
  },
});

function formatDate(value: string): string {
  return format(new Date(value), 'dd/MM/yyyy');
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function buildInvoiceDocument(snapshot: InvoiceSnapshot) {
  const { company, customer, invoice, dispatchReference, items, totals } = snapshot;
  const useIgst = totals.totalIgst > 0;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      React.createElement(
        View,
        { style: styles.headerBlock },
        React.createElement(Text, { style: styles.companyName }, company.name),
        React.createElement(Text, { style: styles.small }, company.address),
        React.createElement(
          Text,
          { style: styles.small },
          `State: ${company.state}  |  GSTIN: ${company.gstin}${company.pan ? `  |  PAN: ${company.pan}` : ''}`
        )
      ),

      React.createElement(Text, { style: styles.title }, 'TAX INVOICE'),

      React.createElement(
        View,
        { style: styles.metaRow },
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Invoice No: '),
            invoice.invoiceNo,
          ]),
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Invoice Date: '),
            formatDate(invoice.date),
          ])
        ),
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Place of Supply: '),
            invoice.place,
          ]),
          invoice.transport
            ? React.createElement(Text, null, [
                React.createElement(Text, { key: 'l', style: styles.label }, 'Transport: '),
                invoice.transport,
              ])
            : null
        )
      ),

      React.createElement(
        View,
        { style: styles.billTo },
        React.createElement(Text, { style: styles.label }, 'Bill To:'),
        React.createElement(Text, null, customer.firmName),
        customer.address ? React.createElement(Text, null, customer.address) : null,
        React.createElement(Text, null, [customer.city, customer.state].filter(Boolean).join(', ')),
        customer.gstin ? React.createElement(Text, null, `GSTIN: ${customer.gstin}`) : null
      ),

      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.cell, styles.cellProduct] }, 'Product'),
          React.createElement(Text, { style: [styles.cell, styles.cellHsn] }, 'HSN'),
          React.createElement(Text, { style: [styles.cell, styles.cellQty] }, 'Qty'),
          React.createElement(Text, { style: [styles.cell, styles.cellUnit] }, 'Unit'),
          React.createElement(Text, { style: [styles.cell, styles.cellPrice] }, 'Price'),
          useIgst
            ? React.createElement(Text, { style: [styles.cell, styles.cellGst] }, 'IGST')
            : React.createElement(
                React.Fragment,
                null,
                React.createElement(Text, { style: [styles.cell, styles.cellGst] }, 'CGST'),
                React.createElement(Text, { style: [styles.cell, styles.cellGst] }, 'SGST')
              ),
          React.createElement(Text, { style: [styles.cell, styles.cellTotal] }, 'Line Total')
        ),
        ...items.map((item, idx) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: idx },
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellProduct] },
              `${item.productName} (${item.categoryName})`
            ),
            React.createElement(Text, { style: [styles.cell, styles.cellHsn] }, item.hsnCode),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellQty] },
              item.quantity.toString()
            ),
            React.createElement(Text, { style: [styles.cell, styles.cellUnit] }, item.unit),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellPrice] },
              formatMoney(item.price)
            ),
            useIgst
              ? React.createElement(
                  Text,
                  { style: [styles.cell, styles.cellGst] },
                  formatMoney(item.igst)
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    Text,
                    { style: [styles.cell, styles.cellGst] },
                    formatMoney(item.cgst)
                  ),
                  React.createElement(
                    Text,
                    { style: [styles.cell, styles.cellGst] },
                    formatMoney(item.sgst)
                  )
                ),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellTotal] },
              formatMoney(item.lineTotal)
            )
          )
        )
      ),

      React.createElement(
        View,
        { style: styles.totalsBlock },
        !useIgst &&
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, 'Total CGST'),
            React.createElement(Text, null, formatMoney(totals.totalCgst))
          ),
        !useIgst &&
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, 'Total SGST'),
            React.createElement(Text, null, formatMoney(totals.totalSgst))
          ),
        useIgst &&
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, 'Total IGST'),
            React.createElement(Text, null, formatMoney(totals.totalIgst))
          ),
        React.createElement(
          View,
          { style: styles.grandTotalRow },
          React.createElement(Text, null, 'Grand Total'),
          React.createElement(Text, null, formatMoney(totals.totalAmount))
        )
      ),

      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          null,
          `Original Challan No: ${dispatchReference.challanNo}  |  Dispatch Date: ${formatDate(dispatchReference.dispatchDate)}`
        ),
        React.createElement(
          Text,
          null,
          'This is a system-generated tax invoice raised against the above dispatch challan.'
        )
      )
    )
  );
}

export async function renderInvoicePdf(snapshot: InvoiceSnapshot): Promise<Buffer> {
  return renderToBuffer(buildInvoiceDocument(snapshot));
}
