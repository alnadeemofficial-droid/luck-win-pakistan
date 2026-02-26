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
