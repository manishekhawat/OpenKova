package expo.modules.kovasms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsPermissionException :
  CodedException(message = "READ_SMS permission has not been granted")

/**
 * Reads the SMS inbox so Kova can pick up bank and card alerts.
 * Only message id, sender, body and timestamp are returned; nothing leaves the device.
 */
class KovaSmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("KovaSms")

    Function("hasPermission") {
      context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      if (context.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
        throw SmsPermissionException()
      }
      val results = mutableListOf<Map<String, Any?>>()
      val cursor = context.contentResolver.query(
        Uri.parse("content://sms/inbox"),
        arrayOf("_id", "address", "body", "date"),
        "date > ?",
        arrayOf(sinceMs.toLong().toString()),
        "date DESC"
      )
      cursor?.use { c ->
        while (c.moveToNext() && results.size < limit) {
          results.add(
            mapOf(
              "id" to c.getString(0),
              "address" to (c.getString(1) ?: ""),
              "body" to (c.getString(2) ?: ""),
              "date" to c.getLong(3).toDouble()
            )
          )
        }
      }
      results
    }
  }
}
