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
