function doGet(e) {
  return handleRequest({ action: 'getData' });
}

function doPost(e) {
  var jsonData;
  try {
    jsonData = JSON.parse(e.postData.contents);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON body' })).setMimeType(ContentService.MimeType.JSON);
  }
  return handleRequest(jsonData);
}

function handleRequest(jsonData) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var action = jsonData.action;
    
    // 1. Login Action
    if (action === 'login') {
      var username = jsonData.username;
      var password = jsonData.password;
      
      // Get credentials from Settings sheet
      var settingsSheet = getOrCreateSheet(doc, 'Settings');
      var storedUsername = settingsSheet.getRange('B1').getValue();
      var storedPassword = settingsSheet.getRange('B2').getValue();
      
      // Initialize default credentials if empty
      if (!storedUsername) {
        settingsSheet.getRange('A1').setValue('Admin Username');
        settingsSheet.getRange('B1').setValue('admin');
        storedUsername = 'admin';
      }
      if (!storedPassword) {
        settingsSheet.getRange('A2').setValue('Admin Password');
        settingsSheet.getRange('B2').setValue('12345');
        storedPassword = '12345';
      }
      
      // Convert to string for comparison
      if (String(username).trim() === String(storedUsername).trim() && String(password).trim() === String(storedPassword).trim()) { 
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', token: 'admin-token-123' })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid credentials' })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2. Get All Data
    if (action === 'getData') {
      var participants = getSheetData(doc, 'Participants');
      var tiers = getSheetData(doc, 'Tiers');
      var announcements = getSheetData(doc, 'Announcements');
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: {
          participants: participants,
          tiers: tiers,
          announcements: announcements
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Add Participant
    if (action === 'addParticipant') {
      var sheet = getOrCreateSheet(doc, 'Participants');
      
      // Ensure Headers exist if sheet is new or empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'id', 'name', 'phone', 'network', 
          'categoryId', 'investAmount', 'trackingId', 'status', 
          'timestamp', 'secretToken', 'isWinner', 'winAmount', 'winningDate'
        ]);
      }

      var rowData = [
        jsonData.id, 
        jsonData.name, 
        jsonData.phone, 
        jsonData.network,
        jsonData.categoryId, 
        jsonData.investAmount || '', 
        jsonData.trackingId || '', 
        jsonData.status,
        jsonData.timestamp, 
        jsonData.secretToken || '', 
        jsonData.isWinner || 'FALSE',
        jsonData.winAmount || '', 
        jsonData.winningDate || ''
      ];
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Update Participant Status
    if (action === 'updateParticipantStatus') {
      updateRowById(doc, 'Participants', jsonData.id, { 'status': jsonData.status }); 
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Update TID
    if (action === 'updateParticipantTID') {
      updateRowById(doc, 'Participants', jsonData.id, { 
        'trackingId': jsonData.trackingId, 
        'status': jsonData.status 
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Update Winner
    if (action === 'updateParticipantWinner') {
      updateRowById(doc, 'Participants', jsonData.id, { 
        'isWinner': 'TRUE', 
        'winAmount': jsonData.winAmount, 
        'winningDate': jsonData.winningDate 
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Save Tiers
    if (action === 'saveTiers') {
      var sheet = getOrCreateSheet(doc, 'Tiers');
      var tiers = jsonData.tiers;
      
      // Only clear and save if we actually received data
      // This prevents wiping the sheet if an empty array is sent by mistake
      if (tiers && Array.isArray(tiers)) {
        sheet.clear(); // Clear existing data
        if (tiers.length > 0) {
          var headers = Object.keys(tiers[0]);
          sheet.appendRow(headers);
          var rows = tiers.map(t => headers.map(h => t[h]));
          if (rows.length > 0) {
             sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
          }
        } else {
           // If array is empty (user deleted all tiers), just set headers or leave empty
           // But let's at least keep headers to avoid confusion
           sheet.appendRow(['id', 'investAmount', 'winAmount', 'membersNeeded', 'currentMembers', 'qrData', 'qrImage', 'color', 'isExpired', 'drawCompleted']);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 8. Save Announcements
    if (action === 'saveAnnouncements') {
      var sheet = getOrCreateSheet(doc, 'Announcements');
      var anns = jsonData.announcements;
      
      if (anns && Array.isArray(anns)) {
        sheet.clear();
        if (anns.length > 0) {
          var headers = Object.keys(anns[0]);
          sheet.appendRow(headers);
          var rows = anns.map(a => headers.map(h => a[h]));
          if (rows.length > 0) {
             sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
          }
        } else {
           sheet.appendRow(['id', 'text', 'textEn', 'active']);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(doc, sheetName) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Only headers or empty
  
  var headers = data[0];
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    results.push(obj);
  }
  return results;
}

function getOrCreateSheet(doc, sheetName) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) {
    sheet = doc.insertSheet(sheetName);
  }
  return sheet;
}

function updateRowById(doc, sheetName, id, updates) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return;
  
  var headers = data[0];
  // Map header name to column index (0-based)
  var headerMap = {};
  for (var h = 0; h < headers.length; h++) {
    headerMap[headers[h]] = h;
  }

  // Find ID column
  var idColIndex = headerMap['id'];
  if (idColIndex === undefined) idColIndex = 0; // Default to first column

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) { 
      for (var key in updates) {
        var colIndex = headerMap[key];
        if (colIndex !== undefined) {
          // getRange(row, col) is 1-indexed. Row is i+1. Col is colIndex+1.
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      }
      return; // Stop after finding the row
    }
  }
}
