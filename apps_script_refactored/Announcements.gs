function saveAnnouncements(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Announcements');
  sheet.clearContents();
  sheet.appendRow(['ID', 'Text (UR)', 'Text (EN)', 'Active']);
  
  data.announcements.forEach(function(a) {
    sheet.appendRow([a.id, a.text, a.textEn, a.active]);
  });
  return { status: 'success', message: 'Announcements saved' };
}
