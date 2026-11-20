import { Settings } from 'lucide-react';
import { GECERLI_DELTA_T_DEGERLERI } from '../../core';
import { deltaTAyarla, nkAyarla } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { disBaglantiAc } from '../platform/tauri';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { useMetinler } from '../ortak/useMetinler';

export const MGM_BAGLANTISI = 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx';

/** Hesabın başlaması için zorunlu iki proje girdisi: Nk ve ΔT. */
export function DeltaTSecici({ deger, degisti, id }: { deger: number | null | undefined; degisti: (d: number | null) => void; id?: string }) {
  const m = useMetinler();
  return (
    <select id={id} value={deger ?? ''} onChange={(e) => degisti(e.target.value === '' ? null : Number(e.target.value))} className={deger == null ? 'girdi-eksik' : ''}>
      <option value="">{m.genel.secilmedi}</option>
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
  const m = useMetinler();
  const t = m.parametre;
  const paratonerBazli = proje.deltaT_modu === 'paratoner';
  return (
    <div className="panel">
      <h3 className="panel-baslik-satir">
        <span>{t.baslik}</span>
        <button className="ikon-buton" onClick={ayarlariAc} title={t.tumAyarlar}>
          <Settings size={14} />
        </button>
      </h3>
      <div className="form-dikey">
        <label>
          {t.nk}
          <SayiGirdisi deger={proje.Nk} degisti={(n) => guncelle(nkAyarla(n), 'nk')} asgari={0} asgariHaric placeholder={m.genel.zorunlu} className={proje.Nk == null ? 'girdi-eksik' : ''} />
        </label>
        <button className="baglanti-buton" onClick={() => disBaglantiAc(MGM_BAGLANTISI)}>
          {t.mgm}
        </button>
        <label>
          {paratonerBazli ? t.varsayilanDeltaT : t.deltaT}
          <DeltaTSecici deger={proje.deltaT_onay_gerekli ? null : proje.deltaT} degisti={(d) => guncelle(deltaTAyarla(d))} />
        </label>
        {proje.deltaT_onay_gerekli && (
          <div className="panel-uyari" role="alert">
            {t.onaysiz(String(proje.deltaT))}
          </div>
        )}
        <p className="ipucu-kucuk">
          {paratonerBazli ? t.paratonerBazliNot : t.projeBazliNot}
        </p>
      </div>
    </div>
  );
}
