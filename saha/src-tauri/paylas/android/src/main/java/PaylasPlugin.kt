// Paratoner Saha — dosya paylaşma eklentisi. Copyright (C) 2026 Buğra Güngöz — GPL-3.0-or-later

package com.bugragungoz.paratoner.saha.paylas

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

/** Uygulamanın kendi FileProvider'ıyla manifestte çakışmaması için ayrı sınıf. */
class PaylasDosyaSaglayici : FileProvider()

@InvokeArg
class DosyaIstegi {
    lateinit var dosyaAdi: String
    lateinit var icerik: String
    var mime: String = "application/octet-stream"
    var baslik: String? = null
}

@TauriPlugin
class PaylasPlugin(private val activity: Activity) : Plugin(activity) {
    /** "Farklı kaydet" penceresi açıkken yazılacak içerik. */
    private var bekleyenIcerik: String? = null

    private fun guvenliAd(ad: String): String = ad.replace(Regex("[\\\\/:*?\"<>|\\u0000-\\u001f]"), "_").take(120).ifBlank { "kesif.kml" }

    @Command
    fun paylas(invoke: Invoke) {
        try {
            val istek = invoke.parseArgs(DosyaIstegi::class.java)
            // Önbellekte yalnızca son paylaşılan dosya tutulur.
            val klasor = File(activity.cacheDir, "paylas").apply { mkdirs() }
            klasor.listFiles()?.forEach { it.delete() }
            val dosya = File(klasor, guvenliAd(istek.dosyaAdi))
            dosya.writeText(istek.icerik, Charsets.UTF_8)
            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.paylas", dosya)
            val gonder = Intent(Intent.ACTION_SEND).apply {
                type = istek.mime
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, istek.baslik ?: dosya.name)
                clipData = ClipData.newRawUri(dosya.name, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(gonder, istek.baslik ?: dosya.name))
            invoke.resolve(JSObject().put("paylasildi", true))
        } catch (e: Exception) {
            invoke.reject(e.message ?: "Paylaşılamadı")
        }
    }

    @Command
    fun kaydet(invoke: Invoke) {
        try {
            val istek = invoke.parseArgs(DosyaIstegi::class.java)
            bekleyenIcerik = istek.icerik
            val sec = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = istek.mime
                putExtra(Intent.EXTRA_TITLE, guvenliAd(istek.dosyaAdi))
            }
            startActivityForResult(invoke, sec, "kaydetSonucu")
        } catch (e: Exception) {
            invoke.reject(e.message ?: "Kaydedilemedi")
        }
    }

    @ActivityCallback
    fun kaydetSonucu(invoke: Invoke, sonuc: ActivityResult) {
        val icerik = bekleyenIcerik
        bekleyenIcerik = null
        val uri = sonuc.data?.data
        if (sonuc.resultCode != Activity.RESULT_OK || uri == null || icerik == null) {
            invoke.resolve(JSObject().put("kaydedildi", false))
            return
        }
        try {
            activity.contentResolver.openOutputStream(uri, "wt")?.use { it.write(icerik.toByteArray(Charsets.UTF_8)) }
                ?: throw IllegalStateException("Dosya açılamadı")
            invoke.resolve(JSObject().put("kaydedildi", true))
        } catch (e: Exception) {
            invoke.reject(e.message ?: "Kaydedilemedi")
        }
    }
}
