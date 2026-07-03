export function determineGstType(companyState: string, vendorState: string): 'CGST_SGST' | 'IGST' {
  const cState = companyState.toLowerCase().trim();
  const vState = vendorState.toLowerCase().trim();

  if (cState === vState) {
    return 'CGST_SGST';
  } else {
    return 'IGST';
  }
}
