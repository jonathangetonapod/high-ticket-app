// Google Apps Script for Users Sheet
// Deploy this as a Web App in your Google Sheet
//
// SETUP:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script
// 3. Paste this code
// 4. Deploy → New deployment → Web app
// 5. Execute as: Me, Who has access: Anyone
// 6. Copy the Web App URL and add to .env.local as GOOGLE_SCRIPT_URL

const USERS_SHEET_NAME = 'Users';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'list') {
    return listUsers();
  } else if (action === 'get') {
    return getUser(e.parameter.id);
  } else if (action === 'login') {
    return validateLogin(e.parameter.email, e.parameter.password);
  }
  
  return jsonResponse({ error: 'Unknown action' }, 400);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'create') {
    return createUser(data.user);
  } else if (action === 'update') {
    return updateUser(data.id, data.updates);
  } else if (action === 'delete') {
    return deleteUser(data.id);
  }
  
  return jsonResponse({ error: 'Unknown action' }, 400);
}

function listUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ users: [] });
  
  const headers = data[0];
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    users.push({
      id: row[0],
      email: row[1],
      name: row[2],
      // Don't return password
      role: row[4],
      created_at: row[5]
    });
  }
  
  return jsonResponse({ users });
}

function getUser(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return jsonResponse({
        user: {
          id: data[i][0],
          email: data[i][1],
          name: data[i][2],
          role: data[i][4],
          created_at: data[i][5]
        }
      });
    }
  }
  
  return jsonResponse({ error: 'User not found' }, 404);
}

function validateLogin(email, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][3] === password) {
      return jsonResponse({
        user: {
          id: data[i][0],
          email: data[i][1],
          name: data[i][2],
          role: data[i][4]
        }
      });
    }
  }
  
  return jsonResponse({ error: 'Invalid credentials' }, 401);
}

function createUser(user) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  // Check if email already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === user.email) {
      return jsonResponse({ error: 'Email already exists' }, 400);
    }
  }
  
  // Generate ID
  const id = 'user_' + Utilities.getUuid().substring(0, 8);
  const createdAt = new Date().toISOString();
  
  // Add row
  sheet.appendRow([
    id,
    user.email,
    user.name,
    user.password,
    user.role || 'strategist',
    createdAt
  ]);
  
  return jsonResponse({
    user: {
      id,
      email: user.email,
      name: user.name,
      role: user.role || 'strategist',
      created_at: createdAt
    }
  });
}

function updateUser(id, updates) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const rowNum = i + 1;
      
      if (updates.email) sheet.getRange(rowNum, 2).setValue(updates.email);
      if (updates.name) sheet.getRange(rowNum, 3).setValue(updates.name);
      if (updates.password) sheet.getRange(rowNum, 4).setValue(updates.password);
      if (updates.role) sheet.getRange(rowNum, 5).setValue(updates.role);
      
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ error: 'User not found' }, 404);
}

function deleteUser(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Users sheet not found' }, 404);
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ error: 'User not found' }, 404);
}

function jsonResponse(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Initialize sheet with headers if empty
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length === 0 || !data[0][0]) {
    sheet.getRange(1, 1, 1, 6).setValues([['id', 'email', 'name', 'password', 'role', 'created_at']]);
    
    // Add default admin user
    const adminId = 'user_admin001';
    sheet.appendRow([
      adminId,
      'jay@leadgenjay.com',
      'Jay (Admin)',
      'changeme123',
      'admin',
      new Date().toISOString()
    ]);
  }
}
