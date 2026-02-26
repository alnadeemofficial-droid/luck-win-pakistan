function rowToParticipant(row) {
  var timestamp = row[8]; // Index 8
  var winningDate = row[12]; // Index 12

  // Helper to parse date to timestamp (number)
  var parseDate = function(d) {
    if (!d) return 0;
    if (typeof d === 'number') return d; 
    if (d instanceof Date) return d.getTime(); 
    return new Date(d).getTime() || 0; 
  };

  return {
    id: String(row[0]),
    name: String(row[1]),
    phone: String(row[2]),
    network: String(row[3]),
    categoryId: String(row[4]),
    investAmount: row[5] ? Number(row[5]) : 0,
    trackingId: String(row[6]),
    status: String(row[7]),
    timestamp: parseDate(timestamp),
    secretToken: String(row[9]),
    isWinner: Boolean(row[10]),
    winAmount: row[11] ? Number(row[11]) : 0,
    winningDate: winningDate ? parseDate(winningDate) : 0
  };
}

function rowToTier(row) {
  return {
    id: String(row[0]),
    investAmount: Number(row[1]),
    winAmount: Number(row[2]),
    membersNeeded: Number(row[3]),
    currentMembers: Number(row[4]),
    color: String(row[5]),
    isExpired: Boolean(row[6]),
    drawCompleted: Boolean(row[7]),
    qrImage: String(row[8]),
    qrData: String(row[9])
  };
}

function rowToAnnouncement(row) {
  return {
    id: String(row[0]),
    text: String(row[1]),
    textEn: String(row[2]),
    active: Boolean(row[3])
  };
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Participants') {
      sheet.appendRow(['id', 'name', 'phone', 'network', 'categoryId', 'investAmount', 'trackingId', 'status', 'timestamp', 'secretToken', 'isWinner', 'winAmount', 'winningDate']);
    } else if (name === 'Tiers') {
      sheet.appendRow(['ID', 'Invest Amount', 'Win Amount', 'Members Needed', 'Current Members', 'Color', 'Is Expired', 'Draw Completed', 'QR Imageurl', 'QR Data']);
    } else if (name === 'Announcements') {
      sheet.appendRow(['ID', 'Text (UR)', 'Text (EN)', 'Active']);
    } else if (name === 'Admin') {
      sheet.appendRow(['Admin Username', 'admin']);
      sheet.appendRow(['Admin Password', 'admin123']);
    }
  }
  return sheet;
}
