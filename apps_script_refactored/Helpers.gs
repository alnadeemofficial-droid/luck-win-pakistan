function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Participants') {
      sheet.appendRow(['ID', 'Name', 'Phone', 'Network', 'Category ID', 'Status', 'Timestamp', 'Secret Token', 'Tracking ID', 'Win Amount', 'Winning Date', 'QR Code URL']);
    } else if (name === 'Tiers') {
      sheet.appendRow(['ID', 'Invest Amount', 'Win Amount', 'Members Needed', 'Current Members', 'Color', 'Is Expired', 'Draw Completed', 'QR Image', 'QR Data']);
    } else if (name === 'Announcements') {
      sheet.appendRow(['ID', 'Text (UR)', 'Text (EN)', 'Active']);
    }
  }
  return sheet;
}

function rowToParticipant(row) {
  return {
    id: row[0],
    name: row[1],
    phone: row[2],
    network: row[3],
    categoryId: row[4],
    status: row[5],
    timestamp: row[6],
    secretToken: row[7],
    trackingId: row[8],
    winAmount: row[9],
    winningDate: row[10],
    // qrCodeUrl: row[11] // Not needed on frontend usually, but stored in sheet
  };
}

function rowToTier(row) {
  return {
    id: row[0],
    investAmount: row[1],
    winAmount: row[2],
    membersNeeded: row[3],
    currentMembers: row[4],
    color: row[5],
    isExpired: row[6],
    drawCompleted: row[7],
    qrImage: row[8],
    qrData: row[9]
  };
}

function rowToAnnouncement(row) {
  return {
    id: row[0],
    text: row[1],
    textEn: row[2],
    active: row[3]
  };
}
