// Tower Bloxx global leaderboard (HTTPS + CORS).
// Hosted on CrudCrud free prototype API — shared by every player.
// If the board goes offline for days, create a new endpoint at https://crudcrud.com/
// and replace `url` below (keep the /scores suffix), then redeploy.
window.TOWER_BLOXX_LEADERBOARD = {
  url: "https://crudcrud.com/api/7a8b38b69d424d71966ab384e0939c96/scores",
  maxNameLen: 10,
  topN: 10,
};
