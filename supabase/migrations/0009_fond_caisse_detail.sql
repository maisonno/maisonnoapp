-- Détail du fond de caisse (coupures laissées dans le tiroir)
alter table scd_caisse
  add column if not exists fond_billets_500  int default 0,
  add column if not exists fond_billets_200  int default 0,
  add column if not exists fond_billets_100  int default 0,
  add column if not exists fond_billets_50   int default 0,
  add column if not exists fond_billets_20   int default 0,
  add column if not exists fond_billets_10   int default 0,
  add column if not exists fond_billets_5    int default 0,
  add column if not exists fond_pieces_2     int default 0,
  add column if not exists fond_pieces_1     int default 0,
  add column if not exists fond_pieces_50c   int default 0,
  add column if not exists fond_pieces_20c   int default 0,
  add column if not exists fond_pieces_10c   int default 0;
