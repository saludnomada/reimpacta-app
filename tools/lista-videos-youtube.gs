/**
 * REIMPACTA · Lista de todos los vídeos de tu canal (también los ocultos)
 * Se pega en una hoja de Google: Extensiones → Apps Script.
 * Necesita el servicio "YouTube Data API v3" (Servicios → +).
 * Escribe en la hoja: Video ID · Title · Description · Privacy
 */
function listarVideos() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  hoja.clear();
  var canal = YouTube.Channels.list('contentDetails', { mine: true });
  var subidos = canal.items[0].contentDetails.relatedPlaylists.uploads;
  var filas = [];
  var pagina = '';
  do {
    var lista = YouTube.PlaylistItems.list('contentDetails', { playlistId: subidos, maxResults: 50, pageToken: pagina });
    var ids = lista.items.map(function (i) { return i.contentDetails.videoId; });
    if (ids.length) {
      var videos = YouTube.Videos.list('snippet,status', { id: ids.join(','), maxResults: 50 });
      videos.items.forEach(function (v) {
        filas.push([v.id, v.snippet.title, v.snippet.description, v.status.privacyStatus]);
      });
    }
    pagina = lista.nextPageToken;
  } while (pagina);
  hoja.getRange(1, 1, 1, 4).setValues([['Video ID', 'Title', 'Description', 'Privacy']]);
  if (filas.length) hoja.getRange(2, 1, filas.length, 4).setValues(filas);
  SpreadsheetApp.getUi().alert('Listo: ' + filas.length + ' vídeos. Ahora: Archivo → Descargar → CSV.');
}
