import { useCallback, useEffect, useState } from 'react';
import { DILLER } from '../../dil';
import { RefreshCw } from 'lucide-react';
import { cihazAyarla, deltaTAyarla, deltaTModuAyarla, hEsikleriAyarla, nkAyarla, tesisAdresiAyarla } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { DeltaTSecici, MGM_BAGLANTISI } from '../paneller/ProjeParametreleriPaneli';
import { Anahtar } from '../ortak/Anahtar';
import { DegerListesi } from '../ortak/DegerListesi';
import { MuhendisAlanlari } from '../ortak/MuhendisAlanlari';
import { CProfilleriAyarlari } from './CProfilleriAyarlari';
import { HaritaServisleriAyarlari } from './HaritaServisleriAyarlari';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { disBaglantiAc, otomatikKayitlariListele, tauriMi, type OtomatikKayitBilgisi } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

export type AyarSekmesi = 'proje' | 'profiller' | 'rapor' | 'harita' | 'uygulama';

const tarih = (ms: number, yerel: string) => new Date(ms).toLocaleString(yerel, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const boyut = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Otomatik kayıt klasörü ve içindeki kayıtlar/yedekler (masaüstü). */
function OtomatikKayitlar({ kurtarmaAc }: { kurtarmaAc: (yol: string) => void }) {
  const { ayarlar, sonOtomatikKayit } = useProje();
  const m = useMetinler();
  const t = m.ayarlar;
  const [liste, setListe] = useState<{ klasor: string; kayitlar: OtomatikKayitBilgisi[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(() => {
    otomatikKayitlariListele(ayarlar.otomatikKayitKonumu)
      .then((l) => {
        setListe(l);
        setHata(null);
      })
      .catch((e) => setHata(e instanceof Error ? e.message : String(e)));
  }, [ayarlar.otomatikKayitKonumu]);

  useEffect(() => {
    yenile();
  }, [yenile, sonOtomatikKayit]);

  return (
    <div className="form-dikey">
      <div className="alan-etiketi satir-icinde">
        <span>{t.kayitlar}</span>
        <button className="ikon-buton" onClick={yenile} title={t.yenile}>
          <RefreshCw size={13} />
        </button>
      </div>
      {liste && <div className="yol-metni">{liste.klasor}</div>}
      {hata && <p className="ipucu-kucuk">{t.listeOkunamadi(hata)}</p>}
      {liste && liste.kayitlar.length === 0 && <p className="ipucu-kucuk">{t.kayitYok}</p>}
      {liste && liste.kayitlar.length > 0 && (
        <div className="kayit-listesi">
          {liste.kayitlar.map((k) => (
            <div key={k.yol} className="kayit-satiri">
              {k.yedek && <span className="kayit-etiketi">{t.yedek}</span>}
              <span className="kayit-satiri-ad" title={k.yol}>
                {k.dosyaAdi}
              </span>
              <span className="kayit-satiri-bilgi">
                {tarih(k.degistirilmeMs, m.bicim.yerel)} · {boyut(k.boyut)}
              </span>
              <button className="mini-buton" onClick={() => kurtarmaAc(k.yol)}>
                {m.genel.ac}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="ipucu-kucuk">{t.kayitNotu}</p>
    </div>
  );
}

export function AyarlarPenceresi({ kapat, ilkSekme = 'proje', kurtarmaAc }: { kapat: () => void; ilkSekme?: AyarSekmesi; kurtarmaAc: (yol: string) => void }) {
  const { proje, guncelle, ayarlar, ayarGuncelle } = useProje();
  const m = useMetinler();
  const t = m.ayarlar;
  const [sekme, setSekme] = useState<AyarSekmesi>(ilkSekme);
  const masaustu = tauriMi();
  const paratonerBazli = proje.deltaT_modu === 'paratoner';
  const ozelDeltaTli = proje.paratonerler.filter((p) => p.deltaT != null).length;

  return (
    <Pencere acik kapat={kapat} baslik={t.baslik} boyut="genis">
      <div className="sekmeler" role="tablist">
        {(
          [
            ['proje', t.sekmeProje],
            ['profiller', t.sekmeProfiller],
            ['rapor', t.sekmeRapor],
            ['harita', t.sekmeHarita],
            ['uygulama', t.sekmeUygulama],
          ] as const
        ).map(([s, etiket]) => (
          <button key={s} role="tab" aria-selected={sekme === s} className={sekme === s ? 'sekme aktif' : 'sekme'} onClick={() => setSekme(s)}>
            {etiket}
          </button>
        ))}
      </div>

      {sekme === 'proje' && (
        <div className="form-dikey">
          <label>
            {t.nk}
            <SayiGirdisi deger={proje.Nk} degisti={(n) => guncelle(nkAyarla(n), 'nk')} asgari={0} asgariHaric placeholder={m.genel.zorunlu} className={proje.Nk == null ? 'girdi-eksik' : ''} />
          </label>
          <button className="baglanti-buton" onClick={() => disBaglantiAc(MGM_BAGLANTISI)}>
            {t.mgm}
          </button>

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">{t.deltaTBaslik}</div>
          <div className="secim-kartlari">
            <button type="button" className={!paratonerBazli ? 'secim-karti secili' : 'secim-karti'} onClick={() => guncelle(deltaTModuAyarla('proje'))}>
              <b>{t.projeBazli}</b>
              <span>{t.projeBazliAciklama}</span>
            </button>
            <button type="button" className={paratonerBazli ? 'secim-karti secili' : 'secim-karti'} onClick={() => guncelle(deltaTModuAyarla('paratoner'))}>
              <b>{t.paratonerBazli}</b>
              <span>{t.paratonerBazliAciklama}</span>
            </button>
          </div>
          <label>
            {paratonerBazli ? t.varsayilanDeltaT : t.projeDeltaT}
            <DeltaTSecici deger={proje.deltaT_onay_gerekli ? null : proje.deltaT} degisti={(d) => guncelle(deltaTAyarla(d))} />
          </label>
          {!paratonerBazli && ozelDeltaTli > 0 && (
            <p className="ipucu-kucuk">{t.ozelDeltaT(ozelDeltaTli)}</p>
          )}
          <label>
            {t.cihaz}
            <input value={proje.cihaz ?? ''} onChange={(e) => guncelle(cihazAyarla(e.target.value), 'cihaz')} placeholder={t.cihazIpucu} />
          </label>

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">{t.cemberler}</div>
          <DegerListesi degerler={proje.h_esikleri_varsayilan} degisti={(d) => guncelle(hEsikleriAyarla(d))} />

          <label>
            {t.tesisAdresi}
            <input value={proje.tesis_adresi ?? ''} onChange={(e) => guncelle(tesisAdresiAyarla(e.target.value), 'tesis-adresi')} placeholder={t.bosKapak} />
          </label>
        </div>
      )}

      {sekme === 'rapor' && (
        <div className="form-dikey">
          <label>
            {t.firma}
            <input value={ayarlar.firmaAdi} onChange={(e) => ayarGuncelle({ firmaAdi: e.target.value })} placeholder={t.bosKapak} />
          </label>
          <MuhendisAlanlari />
          <p className="ipucu-kucuk">{t.raporNotu}</p>
        </div>
      )}

      {sekme === 'profiller' && <CProfilleriAyarlari />}

      {sekme === 'harita' && <HaritaServisleriAyarlari />}

      {sekme === 'uygulama' && (
        <div className="form-dikey">
          <div>
            <div className="alan-etiketi">{t.dil}</div>
            <div className="form-grid-2">
              {DILLER.map((d) => (
                <button key={d} type="button" lang={d} className={ayarlar.dil === d ? 'mod-aktif' : ''} aria-pressed={ayarlar.dil === d} onClick={() => ayarGuncelle({ dil: d })}>
                  {m.dil[d]}
                </button>
              ))}
            </div>
            <p className="ipucu-kucuk">{t.dilNotu}</p>
          </div>
          <hr className="bolum-ayirici" />
          <div>
            <div className="alan-etiketi">{t.tema}</div>
            <div className="form-grid-3">
              {(
                [
                  ['dark', t.koyu],
                  ['light', t.acik],
                  ['sistem', t.sistem],
                ] as const
              ).map(([t, etiket]) => (
                <button key={t} type="button" className={ayarlar.tema === t ? 'mod-aktif' : ''} aria-pressed={ayarlar.tema === t} onClick={() => ayarGuncelle({ tema: t })}>
                  {etiket}
                </button>
              ))}
            </div>
          </div>
          <hr className="bolum-ayirici" />
          <Anahtar
            id="otomatik-kayit"
            checked={ayarlar.otomatikKayit}
            onCheckedChange={(v) => ayarGuncelle({ otomatikKayit: v })}
            etiket={t.otomatikKayit}
            disabled={!masaustu}
          />
          {masaustu ? (
            <>
              <div>
                <div className="alan-etiketi">{t.klasor}</div>
                <div className="form-grid-2">
                  <button type="button" className={ayarlar.otomatikKayitKonumu === 'masaustu' ? 'mod-aktif' : ''} onClick={() => ayarGuncelle({ otomatikKayitKonumu: 'masaustu' })}>
                    {t.masaustunde}
                  </button>
                  <button type="button" className={ayarlar.otomatikKayitKonumu === 'belgeler' ? 'mod-aktif' : ''} onClick={() => ayarGuncelle({ otomatikKayitKonumu: 'belgeler' })}>
                    {t.belgelerde}
                  </button>
                </div>
              </div>
              <OtomatikKayitlar kurtarmaAc={kurtarmaAc} />
            </>
          ) : (
            <p className="ipucu-kucuk">{t.tarayiciNotu}</p>
          )}
        </div>
      )}
    </Pencere>
  );
}
