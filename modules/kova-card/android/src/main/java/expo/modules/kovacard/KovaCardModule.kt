package expo.modules.kovacard

import android.app.Activity
import android.content.Context
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Handler
import android.os.Looper
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads a payment card from a photo (ML Kit OCR) or by tapping it (NFC / EMV contactless).
 * The full card number never leaves this module: JS only gets the last 4 digits and the
 * first 6 (issuer identification), plus expiry and the printed text with long numbers masked.
 */
class KovaCardModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val main = Handler(Looper.getMainLooper())
  private var nfcPromise: Promise? = null
  private var nfcActivity: Activity? = null
  private val nfcTimeout = Runnable { finishNfc(null, "E_TIMEOUT", "No card was detected. Hold the card flat against the back of the phone.") }

  override fun definition() = ModuleDefinition {
    Name("KovaCard")

    Function("nfcState") {
      val adapter = NfcAdapter.getDefaultAdapter(context)
      when {
        adapter == null -> "unsupported"
        !adapter.isEnabled -> "disabled"
        else -> "ready"
      }
    }

    AsyncFunction("recognizeCard") { uri: String, promise: Promise ->
      try {
        val image = InputImage.fromFilePath(context, Uri.parse(uri))
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        recognizer.process(image)
          .addOnSuccessListener { result ->
            val lines = result.textBlocks.flatMap { block -> block.lines.map { it.text } }
            val pan = CardText.findPan(lines)
            promise.resolve(
              mapOf(
                "lines" to lines.map { CardText.maskNumbers(it) },
                "last4" to pan?.takeLast(4),
                "iin" to pan?.take(6)
              )
            )
            recognizer.close()
          }
          .addOnFailureListener { e ->
            promise.reject("E_OCR", e.message ?: "Couldn't read the photo", e)
            recognizer.close()
          }
      } catch (e: Exception) {
        promise.reject("E_IMAGE", e.message ?: "Couldn't open the photo", e)
      }
    }

    AsyncFunction("readCardNfc") { timeoutMs: Int, promise: Promise ->
      val activity = appContext.currentActivity
      val adapter = NfcAdapter.getDefaultAdapter(context)
      if (activity == null || adapter == null) {
        promise.reject("E_NFC_UNAVAILABLE", "This phone doesn't have NFC", null)
      } else if (!adapter.isEnabled) {
        promise.reject("E_NFC_OFF", "NFC is turned off", null)
      } else {
        finishNfc(null, "E_CANCELLED", "A new scan was started")
        synchronized(this@KovaCardModule) {
          nfcPromise = promise
          nfcActivity = activity
        }
        main.post {
          adapter.enableReaderMode(
            activity,
            NfcAdapter.ReaderCallback { tag -> onTag(tag) },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
          )
        }
        main.postDelayed(nfcTimeout, timeoutMs.toLong())
      }
    }

    AsyncFunction("cancelNfc") {
      finishNfc(null, "E_CANCELLED", "Cancelled")
    }

    OnActivityEntersBackground {
      finishNfc(null, "E_CANCELLED", "Kova went to the background")
    }
  }

  private fun onTag(tag: Tag) {
    val iso = IsoDep.get(tag)
    if (iso == null) {
      finishNfc(null, "E_NOT_CARD", "That isn't a contactless payment card")
      return
    }
    try {
      iso.connect()
      iso.timeout = 5000
      finishNfc(EmvReader(iso).read(), null, null)
    } catch (e: Exception) {
      finishNfc(null, "E_READ", e.message ?: "Couldn't read the card. Hold it still and try again.")
    } finally {
      try {
        iso.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun finishNfc(result: Map<String, Any?>?, code: String?, message: String?) {
    val promise: Promise
    val activity: Activity?
    synchronized(this) {
      promise = nfcPromise ?: return
      activity = nfcActivity
      nfcPromise = null
      nfcActivity = null
    }
    main.removeCallbacks(nfcTimeout)
    main.post {
      try {
        if (activity != null) NfcAdapter.getDefaultAdapter(activity)?.disableReaderMode(activity)
      } catch (_: Exception) {
      }
    }
    if (result != null) promise.resolve(result) else promise.reject(code ?: "E_NFC", message, null)
  }
}
