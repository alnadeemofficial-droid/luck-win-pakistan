function addParticipant(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  // Generate QR Code URL
  // Using qrserver API for simplicity. You can use any QR code API.
  var qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(data.secretToken);
  
  // Format timestamp to be more readable in the sheet (e.g., "2/23/2026 10:30:00")
  var timestamp = new Date(data.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }); // Adjust timezone as needed

  sheet.appendRow([
    data.id,
    data.name,
    data.phone,
    data.network, // Network
    data.categoryId,
    data.status,
    timestamp, // Column G: Formatted Timestamp
    data.secretToken,
    data.trackingId,
    '', // Win Amount
    '', // Winning Date
    qrCodeUrl // Column L: QR Code URL
  ]);
  return { status: 'success', message: 'Participant added' };
}

function updateParticipantStatus(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 6).setValue(data.status); // Column F is Status (index 6)
      return { status: 'success', message: 'Status updated' };
    }
  }
  return { status: 'error', message: 'Participant not found' };
}

function updateParticipantTID(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 9).setValue(data.trackingId); // Column I is TID (index 9)
      sheet.getRange(i + 1, 6).setValue(data.status);
      return { status: 'success', message: 'TID updated' };
    }
  }
  return { status: 'error', message: 'Participant not found' };
}

function updateParticipantWinner(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 10).setValue(data.winAmount); // Column J
      sheet.getRange(i + 1, 11).setValue(new Date(data.winningDate).toISOString()); // Column K
      return { status: 'success', message: 'Winner updated' };
    }
  }
  return { status: 'error', message: 'Participant not found' };
}
