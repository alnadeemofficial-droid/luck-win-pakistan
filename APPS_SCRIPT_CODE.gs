function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var output = {};
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getData') {
      output = getAllData(ss);
    } else if (action === 'addParticipant') {
      output = addParticipant(ss, data);
    } else if (action === 'updateParticipantStatus') {
      output = updateParticipantStatus(ss, data);
    } else if (action === 'updateParticipantTID') {
      output = updateParticipantTID(ss, data);
    } else if (action === 'updateParticipantWinner') {
      output = updateParticipantWinner(ss, data);
    } else if (action === 'saveTiers') {
      output = saveTiers(ss, data);
    } else if (action === 'saveAnnouncements') {
      output = saveAnnouncements(ss, data);
    } else if (action === 'login') {
      output = handleLogin(ss, data);
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getAllData(ss) {
  var pSheet = getOrCreateSheet(ss, 'Participants');
  var tSheet = getOrCreateSheet(ss, 'Tiers');
  var aSheet = getOrCreateSheet(ss, 'Announcements');
  
  var participants = pSheet.getDataRange().getValues();
  var tiers = tSheet.getDataRange().getValues();
  var announcements = aSheet.getDataRange().getValues();
  
  // Remove headers
  participants.shift();
  tiers.shift();
  announcements.shift();
  
  return {
    status: 'success',
    data: {
      participants: participants.map(rowToParticipant),
      tiers: tiers.map(rowToTier),
      announcements: announcements.map(rowToAnnouncement)
    }
  };
}

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

function saveTiers(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Tiers');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Invest Amount', 'Win Amount', 'Members Needed', 'Current Members', 'Color', 'Is Expired', 'Draw Completed', 'QR Image', 'QR Data']);
  
  data.tiers.forEach(function(t) {
    sheet.appendRow([t.id, t.investAmount, t.winAmount, t.membersNeeded, t.currentMembers, t.color, t.isExpired, t.drawCompleted, t.qrImage, t.qrData]);
  });
  return { status: 'success', message: 'Tiers saved' };
}

function saveAnnouncements(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Announcements');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Text (UR)', 'Text (EN)', 'Active']);
  
  data.announcements.forEach(function(a) {
    sheet.appendRow([a.id, a.text, a.textEn, a.active]);
  });
  return { status: 'success', message: 'Announcements saved' };
}

function handleLogin(ss, data) {
  // Simple hardcoded check for now, or you can store admins in a sheet
  if (data.username === 'admin' && data.password === 'admin123') {
     return { status: 'success', message: 'Login successful' };
  }
  return { status: 'error', message: 'Invalid credentials' };
}

// Helpers
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
