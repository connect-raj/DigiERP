import React from 'react';
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { format } from 'date-fns';

export interface DispatchSlipCompany {
  name: string;
  address: string;
  state: string;
  gstin: string;
  pan: string | null;
}

export interface DispatchSlipCustomer {
  firmName: string;
  state: string;
  gstin: string | null;
}

export interface DispatchSlipMeta {
  challanNo: string;
  date: string;
  place: string;
  transport: string | null;
  transportAmount: number;
}

export interface DispatchSlipItem {
  productName: string;
  categoryName: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface DispatchSlipSnapshot {
  company: DispatchSlipCompany;
  customer: DispatchSlipCustomer;
  dispatch: DispatchSlipMeta;
  items: DispatchSlipItem[];
  totalAmount: number;
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
  cellSno: { width: '8%' },
  cellProduct: { width: '46%' },
  cellQty: { width: '15%', textAlign: 'right' },
  cellPrice: { width: '15%', textAlign: 'right' },
  cellTotal: { width: '16%', textAlign: 'right', borderRightWidth: 0 },
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
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 8,
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

function buildDispatchSlipDocument(snapshot: DispatchSlipSnapshot) {
  const { company, customer, dispatch, items, totalAmount } = snapshot;
  const hasTransport = dispatch.transportAmount > 0;

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

      React.createElement(Text, { style: styles.title }, 'DELIVERY CHALLAN'),

      React.createElement(
        View,
        { style: styles.metaRow },
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Challan No: '),
            dispatch.challanNo,
          ]),
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Dispatch Date: '),
            formatDate(dispatch.date),
          ])
        ),
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, null, [
            React.createElement(Text, { key: 'l', style: styles.label }, 'Place of Dispatch: '),
            dispatch.place,
          ]),
          dispatch.transport
            ? React.createElement(Text, null, [
                React.createElement(Text, { key: 'l', style: styles.label }, 'Transport: '),
                dispatch.transport,
              ])
            : null
        )
      ),

      React.createElement(
        View,
        { style: styles.billTo },
        React.createElement(Text, { style: styles.label }, 'Deliver To:'),
        React.createElement(Text, null, customer.firmName),
        React.createElement(Text, null, `State: ${customer.state}`),
        customer.gstin ? React.createElement(Text, null, `GSTIN: ${customer.gstin}`) : null
      ),

      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.cell, styles.cellSno] }, '#'),
          React.createElement(Text, { style: [styles.cell, styles.cellProduct] }, 'Product'),
          React.createElement(Text, { style: [styles.cell, styles.cellQty] }, 'Qty'),
          React.createElement(Text, { style: [styles.cell, styles.cellPrice] }, 'Rate'),
          React.createElement(Text, { style: [styles.cell, styles.cellTotal] }, 'Amount')
        ),
        ...items.map((item, idx) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: idx },
            React.createElement(Text, { style: [styles.cell, styles.cellSno] }, String(idx + 1)),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellProduct] },
              `${item.productName} (${item.categoryName})`
            ),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellQty] },
              item.quantity.toString()
            ),
            React.createElement(
              Text,
              { style: [styles.cell, styles.cellPrice] },
              formatMoney(item.price)
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
        hasTransport &&
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, 'Transport'),
            React.createElement(Text, null, formatMoney(dispatch.transportAmount))
          ),
        React.createElement(
          View,
          { style: styles.grandTotalRow },
          React.createElement(Text, null, 'Grand Total'),
          React.createElement(Text, null, formatMoney(totalAmount))
        )
      ),

      React.createElement(
        View,
        { style: styles.signatureRow },
        React.createElement(Text, { style: styles.signatureBox }, 'Receiver Signature'),
        React.createElement(
          Text,
          { style: styles.signatureBox },
          `For ${company.name}\nAuthorised Signatory`
        )
      ),

      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          null,
          'This delivery challan is not a tax invoice. A tax invoice is raised separately against this dispatch.'
        )
      )
    )
  );
}

export async function renderDispatchSlipPdf(snapshot: DispatchSlipSnapshot): Promise<Buffer> {
  return renderToBuffer(buildDispatchSlipDocument(snapshot));
}
