/**
 * Google Apps Script Backend for LuckWin
 * 
 * REQUIRED PERMISSIONS:
 * - SpreadsheetApp (to access Google Sheets)
 * - LockService (to prevent concurrent write issues)
 * 
 * DEPLOYMENT:
 * - Deploy as Web App
 * - Execute as: Me
 * - Who has access: Anyone
 */

function doGet(e) {
  return ContentService.createTextOutput("LuckWin Backend is Running. Use POST requests to interact.").setMimeType(ContentService.MimeType.TEXT);
}

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
