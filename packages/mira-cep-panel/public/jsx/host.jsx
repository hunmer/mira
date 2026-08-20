// Mira 面板宿主脚本(ExtendScript):把本地临时目录的素材文件置入/打开到 Photoshop
function miraPlaceFile(path) {
  try {
    var f = new File(path);
    if (!f.exists) return 'ERR:文件不存在 ' + path;
    // 无打开文档时直接 open,否则 place 为智能对象(居中)
    if (app.documents.length === 0) {
      try { open(f); } catch (e1) { /* 同名文档可能已处于打开状态,视为成功 */ }
      return 'opened';
    }
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID('null'), f);
    executeAction(stringIDToTypeID('placeEvent'), desc, DialogModes.NO);
    return 'placed';
  } catch (e) {
    return 'ERR:' + e.toString();
  }
}
