function addParticipant(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  
  // Format timestamp to be more readable in the sheet (e.g., "2/23/2026 10:30:00")
  // Using ISO string is safer for parsing back to timestamp
  var timestamp = new Date(data.timestamp).toISOString();

  sheet.appendRow([
    data.id,
    data.name,
    data.phone,
    data.network,
    data.categoryId,
    data.investAmount || '', // investAmount
    data.trackingId,
    data.status,
    timestamp,
    data.secretToken,
    false, // isWinner
    '', // winAmount
    '' // winningDate
  ]);
  return { status: 'success', message: 'Participant added' };
}

function updateParticipantStatus(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Participants');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 8).setValue(data.status); // Column H is Status (index 8)
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
      sheet.getRange(i + 1, 7).setValue(data.trackingId); // Column G is TID (index 7)
      sheet.getRange(i + 1, 8).setValue(data.status); // Column H is Status
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
      sheet.getRange(i + 1, 11).setValue(true); // Column K is isWinner (index 11)
      sheet.getRange(i + 1, 12).setValue(data.winAmount); // Column L is winAmount (index 12)
      sheet.getRange(i + 1, 13).setValue(new Date(data.winningDate).toISOString()); // Column M is winningDate (index 13)
      return { status: 'success', message: 'Winner updated' };
    }
  }
  return { status: 'error', message: 'Participant not found' };
}
