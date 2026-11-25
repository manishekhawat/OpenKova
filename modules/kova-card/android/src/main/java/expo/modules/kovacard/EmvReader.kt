package expo.modules.kovacard

import android.nfc.TagLostException
import android.nfc.tech.IsoDep
import java.io.ByteArrayOutputStream
import java.security.SecureRandom
import java.util.Calendar

/**
 * Minimal EMV contactless reader: SELECT PPSE → SELECT application → GET PROCESSING OPTIONS →
 * READ RECORD, looking for the card number (tag 5A / track 2 tag 57) and expiry (5F24).
 */
internal class EmvReader(private val iso: IsoDep) {

  companion object {
    // Visa, Visa Electron, V Pay, Mastercard, Maestro, RuPay, Amex, Diners/Discover
    private val KNOWN_AIDS = listOf(
      "A0000000031010", "A0000000032010", "A0000000033010",
      "A0000000041010", "A0000000043060",
      "A0000005241010",
      "A00000002501",
      "A0000001523010"
    ).map { hex(it) }

    fun hex(s: String): ByteArray = s.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    fun toHex(b: ByteArray): String = b.joinToString("") { "%02X".format(it) }
  }

  fun read(): Map<String, Any?> {
    val ppse = transceive(select("2PAY.SYS.DDF01".toByteArray(Charsets.US_ASCII)))
    val aids = if (ok(ppse)) Tlv.findAll(body(ppse), 0x4F) else emptyList()
    val candidates = (aids + KNOWN_AIDS).distinctBy { toHex(it) }

    for (aid in candidates) {
      val sel = transceive(select(aid))
      if (!ok(sel)) continue
      val fci = body(sel)
      val label = Tlv.find(fci, 0x50)?.let { String(it, Charsets.US_ASCII).trim() }
      val found = readApplication(fci)
      val pan = found.pan ?: continue
      return mapOf(
        "last4" to pan.takeLast(4),
        "iin" to pan.take(6),
        "expiryYear" to found.expYear,
        "expiryMonth" to found.expMonth,
        "label" to label,
        "aid" to toHex(aid)
      )
    }
    throw IllegalStateException("Couldn't find a card number on this card. Some cards don't share it over NFC; try a photo instead.")
  }

  private class Found {
    var pan: String? = null
    var expYear: Int? = null
    var expMonth: Int? = null
    val complete get() = pan != null && expYear != null
  }

  private fun absorb(tlv: ByteArray, f: Found) {
    if (f.pan == null) Tlv.find(tlv, 0x5A)?.let { f.pan = toHex(it).trimEnd('F') }
    if (f.expYear == null) Tlv.find(tlv, 0x5F24)?.let {
      val h = toHex(it)
      if (h.length >= 4) {
        f.expYear = 2000 + h.substring(0, 2).toInt()
        f.expMonth = h.substring(2, 4).toInt()
      }
    }
    if (!f.complete) Tlv.find(tlv, 0x57)?.let {
      val h = toHex(it)
      val sep = h.indexOf('D')
      if (sep > 0) {
        if (f.pan == null) f.pan = h.substring(0, sep)
        if (f.expYear == null && h.length >= sep + 5) {
          f.expYear = 2000 + h.substring(sep + 1, sep + 3).toInt()
          f.expMonth = h.substring(sep + 3, sep + 5).toInt()
        }
      }
    }
  }

  private fun readApplication(fci: ByteArray): Found {
    val f = Found()
    val gpo = transceive(gpoCommand(Tlv.find(fci, 0x9F38)))
    var afl: ByteArray? = null
    if (ok(gpo)) {
      val g = body(gpo)
      absorb(g, f)
      // Format 2 (tag 77) carries AFL in tag 94; format 1 is 80 <len> AIP(2) AFL…
      afl = Tlv.find(g, 0x94) ?: if (g.size > 4 && g[0] == 0x80.toByte()) g.copyOfRange(4, g.size) else null
    }
    if (!f.complete && afl != null) {
      var i = 0
      while (i + 3 < afl.size && !f.complete) {
        val sfi = (afl[i].toInt() and 0xFF) shr 3
        val first = afl[i + 1].toInt() and 0xFF
        val last = afl[i + 2].toInt() and 0xFF
        for (rec in first..last) {
          val r = transceive(readRecord(sfi, rec))
          if (ok(r)) absorb(body(r), f)
        }
        i += 4
      }
    }
    if (f.pan == null) {
      // Some cards refuse our GPO; the number usually still sits in one of the first records.
      for (sfi in 1..4) {
        for (rec in 1..4) {
          if (f.complete) break
          val r = transceive(readRecord(sfi, rec))
          if (ok(r)) absorb(body(r), f)
        }
      }
    }
    return f
  }

  private fun gpoCommand(pdol: ByteArray?): ByteArray {
    val data = ByteArrayOutputStream()
    if (pdol != null) {
      var i = 0
      while (i < pdol.size) {
        var tag = pdol[i].toInt() and 0xFF
        i++
        if ((tag and 0x1F) == 0x1F && i < pdol.size) {
          tag = (tag shl 8) or (pdol[i].toInt() and 0xFF)
          i++
        }
        if (i >= pdol.size) break
        val len = pdol[i].toInt() and 0xFF
        i++
        val v = terminalValue(tag, len)
        data.write(v, 0, v.size)
      }
    }
    val d = data.toByteArray()
    val cmd = ByteArrayOutputStream()
    val head = byteArrayOf(0x80.toByte(), 0xA8.toByte(), 0x00, 0x00, (d.size + 2).toByte(), 0x83.toByte(), d.size.toByte())
    cmd.write(head, 0, head.size)
    cmd.write(d, 0, d.size)
    cmd.write(0x00)
    return cmd.toByteArray()
  }

  /** Values a simple terminal would send, sized to what the card asked for. */
  private fun terminalValue(tag: Int, len: Int): ByteArray {
    val v: ByteArray = when (tag) {
      0x9F66 -> hex("36000000") // terminal transaction qualifiers: qVSDC + EMV contact
      0x9F1A -> hex("0356") // terminal country: India
      0x5F2A -> hex("0356") // currency: INR
      0x9A -> {
        val c = Calendar.getInstance()
        hex("%02d%02d%02d".format(c.get(Calendar.YEAR) % 100, c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH)))
      }
      0x9C -> hex("00") // transaction type: purchase
      0x9F35 -> hex("22") // terminal type
      0x9F37 -> ByteArray(4).also { SecureRandom().nextBytes(it) } // unpredictable number
      else -> ByteArray(0)
    }
    val out = ByteArray(len)
    System.arraycopy(v, 0, out, 0, minOf(len, v.size))
    return out
  }

  private fun select(aid: ByteArray): ByteArray =
    byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, aid.size.toByte()) + aid + byteArrayOf(0x00)

  private fun readRecord(sfi: Int, rec: Int): ByteArray =
    byteArrayOf(0x00, 0xB2.toByte(), rec.toByte(), ((sfi shl 3) or 4).toByte(), 0x00)

  private fun transceive(cmd: ByteArray): ByteArray {
    val r = try {
      iso.transceive(cmd)
    } catch (e: TagLostException) {
      throw IllegalStateException("The card moved away. Hold it still against the phone.")
    } catch (e: Exception) {
      return ByteArray(0)
    }
    if (r.size == 2) {
      val sw1 = r[0].toInt() and 0xFF
      val sw2 = r[1]
      if (sw1 == 0x6C) { // wrong length: resend with the length the card wants
        val again = cmd.copyOf()
        again[again.size - 1] = sw2
        return try { iso.transceive(again) } catch (e: Exception) { ByteArray(0) }
      }
      if (sw1 == 0x61) { // more data waiting
        return try { iso.transceive(byteArrayOf(0x00, 0xC0.toByte(), 0x00, 0x00, sw2)) } catch (e: Exception) { ByteArray(0) }
      }
    }
    return r
  }

  private fun ok(r: ByteArray) = r.size >= 2 && r[r.size - 2] == 0x90.toByte() && r[r.size - 1] == 0x00.toByte()
  private fun body(r: ByteArray) = r.copyOfRange(0, r.size - 2)
}

/** BER-TLV search (recursive into constructed tags). */
internal object Tlv {
  fun find(data: ByteArray, tag: Int): ByteArray? = findAll(data, tag).firstOrNull()

  fun findAll(data: ByteArray, tag: Int): List<ByteArray> {
    val out = mutableListOf<ByteArray>()
    walk(data, 0, data.size, tag, out, 0)
    return out
  }

  private fun walk(d: ByteArray, start: Int, end: Int, want: Int, out: MutableList<ByteArray>, depth: Int) {
    var i = start
    while (i < end) {
      val b0 = d[i].toInt() and 0xFF
      if (b0 == 0x00 || b0 == 0xFF) {
        i++
        continue
      }
      val constructed = (b0 and 0x20) != 0
      var tag = b0
      i++
      if ((b0 and 0x1F) == 0x1F) {
        while (i < end) {
          val b = d[i].toInt() and 0xFF
          tag = (tag shl 8) or b
          i++
          if ((b and 0x80) == 0) break
        }
      }
      if (i >= end) return
      var len = d[i].toInt() and 0xFF
      i++
      if ((len and 0x80) != 0) {
        val n = len and 0x7F
        len = 0
        repeat(n) {
          if (i < end) {
            len = (len shl 8) or (d[i].toInt() and 0xFF)
            i++
          }
        }
      }
      if (len < 0 || i + len > end) return
      if (tag == want) out.add(d.copyOfRange(i, i + len))
      if (constructed && depth < 8) walk(d, i, i + len, want, out, depth + 1)
      i += len
    }
  }
}

/** Finds a Luhn-valid card number in OCR text and masks long numbers before they reach JS. */
internal object CardText {
  private val groups = Regex("""(?:\d[ \-]?){12,18}\d""")
  private val longNumber = Regex("""(?:\d[ \-]?){7,}\d""")

  fun findPan(lines: List<String>): String? {
    val candidates = lines + lines.zipWithNext { a, b -> "$a $b" }
    for (c in candidates) {
      val cleaned = c.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1')
      for (m in groups.findAll(cleaned)) {
        val digits = m.value.filter { it.isDigit() }
        if (digits.length in 13..19 && luhn(digits)) return digits
      }
    }
    return null
  }

  fun maskNumbers(s: String): String = longNumber.replace(s) { m ->
    val d = m.value.filter { it.isDigit() }
    "•••• " + d.takeLast(4)
  }

  private fun luhn(n: String): Boolean {
    var sum = 0
    var alt = false
    for (i in n.length - 1 downTo 0) {
      var x = n[i] - '0'
      if (alt) {
        x *= 2
        if (x > 9) x -= 9
      }
      sum += x
      alt = !alt
    }
    return sum % 10 == 0
  }
}
