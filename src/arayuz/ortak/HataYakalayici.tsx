// Beklenmeyen bir arayüz hatasında beyaz ekran yerine ne olduğunu ve nasıl devam edileceğini
// gösterir. Proje her değişiklikte tarayıcı belleğine (ve masaüstünde otomatik kayıt klasörüne)
// yazıldığı için yeniden yükleme son durumu geri getirir.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { metinler } from '../../dil';
import { ayarlariYukle } from '../durum/ayarlar';
import { ParatonerIsareti } from './Logo';

interface Durum {
  hata: Error | null;
  ayrinti: string;
  kopyalandi: boolean;
}

export class HataYakalayici extends Component<{ children: ReactNode }, Durum> {
  override state: Durum = { hata: null, ayrinti: '', kopyalandi: false };

  static getDerivedStateFromError(hata: Error): Partial<Durum> {
    return { hata };
  }

  override componentDidCatch(hata: Error, bilgi: ErrorInfo) {
    console.error('Beklenmeyen hata:', hata, bilgi.componentStack);
    this.setState({ ayrinti: `${hata.name}: ${hata.message}\n${hata.stack ?? ''}\n${bilgi.componentStack ?? ''}`.trim() });
  }

  private async kopyala() {
    try {
      await navigator.clipboard.writeText(`Paratoner Risk Analizi ${__UYGULAMA_SURUMU__}\n${this.state.ayrinti}`);
      this.setState({ kopyalandi: true });
    } catch {
      // Pano kapalıysa ayrıntı ekranda seçilip kopyalanabilir.
    }
  }

  override render() {
    if (!this.state.hata) return this.props.children;
    let t = metinler('tr').hataYakalayici;
    try {
      t = metinler(ayarlariYukle().dil).hataYakalayici;
    } catch {
      // Ayarlar okunamazsa Türkçe kalır.
    }
    return (
      <div className="hata-ekrani" role="alert">
        <div className="hata-ekrani-kutu">
          <ParatonerIsareti boyut={28} className="wordmark-isaret" />
          <h1>{t.baslik}</h1>
          <p>{t.kaydedildi}</p>
          <p className="ipucu-kucuk">{t.tekrar}</p>
          <pre className="hata-ekrani-ayrinti">{this.state.hata.message}</pre>
          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={() => this.kopyala()}>
              {this.state.kopyalandi ? t.kopyalandi : t.kopyala}
            </button>
            <button className="buton-birincil" onClick={() => location.reload()}>
              {t.yenidenYukle}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
