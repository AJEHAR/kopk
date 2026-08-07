// ============================================================
// Apps Script untuk terima upload dokumen dari admin dashboard
// KOPK MSS Pahang, dan simpan terus ke Google Drive anda.
//
// CARA PASANG (buat sekali sahaja):
// 1. Buka drive.google.com -> cipta folder baru (contoh "Dokumen KOPK")
//    -> buka folder tu -> salin FOLDER_ID dari URL:
//    https://drive.google.com/drive/folders/INI_FOLDER_ID
//
// 2. Buka script.google.com -> New project -> padam kod default,
//    tampal SEMUA kod ni -> gantikan SECRET_KEY dan FOLDER_ID di bawah
//
// 3. Klik "Deploy" -> "New deployment" -> ikon gear pilih "Web app"
//    - Execute as: Me
//    - Who has access: Anyone
//    -> Deploy -> Salin "Web app URL" yang diberikan
//
// 4. Buka fail apps-script-config.js dalam repo, tampal Web App URL
//    dan SECRET_KEY yang SAMA macam di bawah
// ============================================================

var SECRET_KEY = "GANTI_DENGAN_KOD_RAHSIA_ANDA"; // contoh: "kopk-rahsia-2026" - apa-apa string unik
var FOLDER_ID = "GANTI_DENGAN_FOLDER_ID_DRIVE";   // ID folder Drive destinasi (langkah 1 di atas)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.secret !== SECRET_KEY) {
      return jsonOutput({ ok: false, error: "Kunci rahsia salah." });
    }
    if (!data.base64 || !data.filename) {
      return jsonOutput({ ok: false, error: "Data fail tidak lengkap." });
    }

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var bytes = Utilities.base64Decode(data.base64);
    var blob = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", data.filename);
    var file = folder.createFile(blob);

    // buat fail boleh diakses sesiapa yang ada link (untuk paparan awam laman)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonOutput({
      ok: true,
      url: "https://drive.google.com/file/d/" + file.getId() + "/view",
      name: file.getName()
    });

  } catch (err) {
    return jsonOutput({ ok: false, error: err.toString() });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
