import { Settings } from 'lucide-react';
import { GECERLI_DELTA_T_DEGERLERI } from '../../core';
import { deltaTAyarla, nkAyarla } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { disBaglantiAc } from '../platform/tauri';
import { SayiGirdisi } from '../ortak/SayiGirdisi';

export const MGM_BAGLANTISI = 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx';

/** Hesabın başlaması için zorunlu iki proje girdisi: Nk ve ΔT. */
export function DeltaTSecici({ deger, degisti, id }: { deger: number | null | undefined; degisti: (d: number | null) => void; id?: string }) {
  return (
    <select id={id} value={deger ?? ''} onChange={(e) => degisti(e.target.value === '' ? null : Number(e.target.value))} className={deger == null ? 'girdi-eksik' : ''}>
      <option value="">Seçilmedi</option>
      {GECERLI_DELTA_T_DEGERLERI.map((d) => (
        <option key={d} value={d}>
          {d} µs
        </option>
      ))}
    </select>
  );
}

export function ProjeParametreleriPaneli({ ayarlariAc }: { ayarlariAc: () => void }) {
  const { proje, guncelle } = useProje();
  const paratonerBazli = proje.deltaT_modu === 'paratoner';
  return (
    <div className="panel">
      <h3 className="panel-baslik-satir">
        <span>Proje parametreleri</span>
        <button className="ikon-buton" onClick={ayarlariAc} title="Tüm ayarlar">
          <Settings size={14} />
        </button>
      </h3>
      <div className="form-dikey">
        <label>
          Nk — Yıldırımlı gün sayısı
          <SayiGirdisi deger={proje.Nk} degisti={(n) => guncelle(nkAyarla(n), 'nk')} asgari={0} asgariHaric placeholder="Zorunlu" className={proje.Nk == null ? 'girdi-eksik' : ''} />
        </label>
        <button className="baglanti-buton" onClick={() => disBaglantiAc(MGM_BAGLANTISI)}>
          MGM il/ilçe istatistiklerinde oraj gün sayısı →
        </button>
        <label>
          {paratonerBazli ? 'Varsayılan ΔT (paratoner bazlı mod)' : 'ΔT — Paratoner yayılım süresi'}
          <DeltaTSecici deger={proje.deltaT_onay_gerekli ? null : proje.deltaT} degisti={(d) => guncelle(deltaTAyarla(d))} />
        </label>
        {proje.deltaT_onay_gerekli && (
          <div className="panel-uyari" role="alert">
            Eski sürümden aktarılan ΔT ({proje.deltaT} µs) onaylanmadı; hesap yapılmıyor. Paratonerinizin belgesindeki ΔT değerini seçin.
          </div>
        )}
        <p className="ipucu-kucuk">
          {paratonerBazli
            ? 'Her paratoner kendi ΔT değerini kullanır; girilmemişse bu değer geçerlidir. Mod Ayarlar\'dan değiştirilir.'
            : 'Kullandığınız paratonerin belgesindeki ΔT değerini seçin. Paratoner bazında farklı ΔT için Ayarlar\'dan modu değiştirin.'}
        </p>
      </div>
    </div>
  );
}
