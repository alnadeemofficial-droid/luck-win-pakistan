function saveTiers(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Tiers');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Invest Amount', 'Win Amount', 'Members Needed', 'Current Members', 'Color', 'Is Expired', 'Draw Completed', 'QR Image', 'QR Data']);
  
  data.tiers.forEach(function(t) {
    sheet.appendRow([t.id, t.investAmount, t.winAmount, t.membersNeeded, t.currentMembers, t.color, t.isExpired, t.drawCompleted, t.qrImage, t.qrData]);
  });
  return { status: 'success', message: 'Tiers saved' };
}
