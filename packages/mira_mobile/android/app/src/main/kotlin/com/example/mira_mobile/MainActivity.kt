package com.example.mira_mobile

import android.content.ActivityNotFoundException
import android.content.Intent
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "mira/open_file")
            .setMethodCallHandler { call, result ->
                if (call.method != "open") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }

                val path = call.arguments as? String
                if (path.isNullOrEmpty()) {
                    result.error("INVALID_PATH", "File path is empty", null)
                    return@setMethodCallHandler
                }

                val file = File(path)
                if (!file.exists()) {
                    result.error("NOT_FOUND", "File does not exist", null)
                    return@setMethodCallHandler
                }

                val uri = FileProvider.getUriForFile(
                    this,
                    "${applicationContext.packageName}.fileprovider",
                    file,
                )
                val extension = file.extension.lowercase()
                val mimeType = MimeTypeMap.getSingleton()
                    .getMimeTypeFromExtension(extension) ?: "*/*"
                val openIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, mimeType)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                try {
                    startActivity(Intent.createChooser(openIntent, null))
                    result.success(null)
                } catch (_: ActivityNotFoundException) {
                    result.error("NO_HANDLER", "No app can open this file", null)
                }
            }
    }
}
