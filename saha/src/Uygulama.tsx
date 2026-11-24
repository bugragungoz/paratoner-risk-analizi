import { useSaha } from './baglam';
import { Ayarlar } from './ekranlar/Ayarlar';
import { Kesif } from './ekranlar/Kesif';
import { Kesifler } from './ekranlar/Kesifler';
import { Kurulum } from './ekranlar/Kurulum';
import { ParatonerEkrani } from './ekranlar/ParatonerEkrani';

export function Uygulama() {
  const { rota, ayarlar } = useSaha();
  if (!ayarlar.kurulumTamam) return <Kurulum />;
  if (rota.tur === 'ayarlar') return <Ayarlar />;
  if (rota.tur === 'paratoner') return <ParatonerEkrani key={rota.pid} id={rota.id} pid={rota.pid} />;
  if (rota.tur === 'kesif') return <Kesif key={rota.id} id={rota.id} />;
  return <Kesifler />;
}
