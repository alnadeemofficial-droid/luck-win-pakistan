# Google Apps Script مکمل کوڈ اور سیٹ اپ گائیڈ

آپ کی دی گئی نئی شیٹ کے مطابق تمام کوڈ اپ ڈیٹ کر دیا گیا ہے۔ نیچے دی گئی ہدایات پر عمل کریں۔

## مرحلہ 1: Google Apps Script پروجیکٹ کھولیں

1. اپنی Google Sheet کھولیں۔
2. **Extensions** > **Apps Script** پر کلک کریں۔
3. اگر پہلے سے کوئی کوڈ موجود ہے تو اسے ڈیلیٹ کر دیں یا نئی فائلیں بنائیں۔

## مرحلہ 2: فائلیں بنائیں اور کوڈ پیسٹ کریں

آپ کو Apps Script ایڈیٹر میں بائیں جانب **Files +** کے نشان پر کلک کر کے درج ذیل ناموں سے فائلیں بنانی ہیں اور ان میں دیا گیا کوڈ پیسٹ کرنا ہے۔

### 1. Code.gs
(یہ مین فائل ہے)

```javascript
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
```

### 2. Data.gs

```javascript
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
```

### 3. Participants.gs

```javascript
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
```

### 4. Tiers.gs

```javascript
function saveTiers(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Tiers');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Invest Amount', 'Win Amount', 'Members Needed', 'Current Members', 'Color', 'Is Expired', 'Draw Completed', 'QR Imageurl', 'QR Data']);
  
  data.tiers.forEach(function(t) {
    sheet.appendRow([t.id, t.investAmount, t.winAmount, t.membersNeeded, t.currentMembers, t.color, t.isExpired, t.drawCompleted, t.qrImage, t.qrData]);
  });
  return { status: 'success', message: 'Tiers saved' };
}
```

### 5. Announcements.gs

```javascript
function saveAnnouncements(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Announcements');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Text (UR)', 'Text (EN)', 'Active']);
  
  data.announcements.forEach(function(a) {
    sheet.appendRow([a.id, a.text, a.textEn, a.active]);
  });
  return { status: 'success', message: 'Announcements saved' };
}
```

### 6. Auth.gs

```javascript
function handleLogin(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Admin');
  var rows = sheet.getDataRange().getValues();
  
  var adminUsername = '';
  var adminPassword = '';
  
  // Assuming structure:
  // Row 1: [Admin Username, value]
  // Row 2: [Admin Password, value]
  
  if (rows.length >= 2) {
    adminUsername = rows[0][1]; // Row 1, Col 2
    adminPassword = rows[1][1]; // Row 2, Col 2
  }
  
  // Fallback if sheet is empty or malformed
  if (!adminUsername) adminUsername = 'admin';
  if (!adminPassword) adminPassword = 'admin123';

  if (data.username === adminUsername && data.password === adminPassword) {
     return { status: 'success', message: 'Login successful' };
  }
  return { status: 'error', message: 'Invalid credentials' };
}
```

### 7. Helpers.gs

```javascript
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
```

## مرحلہ 3: ڈپلائے (Deploy) کریں

1. اوپر دائیں کونے میں نیلے رنگ کے **Deploy** بٹن پر کلک کریں۔
2. **New deployment** منتخب کریں۔
3. **Select type** میں **Web app** منتخب کریں۔
4. سیٹنگز یہ رکھیں:
    *   **Description**: Updated version
    *   **Execute as**: **Me** (آپ کا ای میل)
    *   **Who has access**: **Anyone** (یہ بہت ضروری ہے تاکہ ویب سائٹ ڈیٹا بھیج سکے)
5. **Deploy** پر کلک کریں۔
6. **Authorize access** کا پوچھے تو:
    *   Review permissions پر کلک کریں۔
    *   اپنا اکاؤنٹ منتخب کریں۔
    *   Advanced پر کلک کریں اور **Go to [Project Name] (unsafe)** پر کلک کریں۔
    *   **Allow** پر کلک کریں۔
7. جو **Web App URL** ملے گا اسے کاپی کر لیں۔

## مرحلہ 4: ویب سائٹ میں URL اپ ڈیٹ کریں

1. اپنی ویب سائٹ کے `.env` فائل میں جائیں۔
2. `GOOGLE_SCRIPT_URL` کے سامنے نیا URL پیسٹ کر دیں۔
3. اگر `.env` فائل نہیں ہے تو `api/index.ts` میں جہاں `GOOGLE_SCRIPT_URL` لکھا ہے وہاں پیسٹ کریں۔
