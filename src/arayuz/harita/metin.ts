// Kullanıcı metinlerini (paratoner/yapı adları) haritaya GÜVENLİ biçimde yazmak için.
// Leaflet etiketlerine HTML dizesi verilirse proje dosyasındaki bir ad kod çalıştırabilir (G1);
// bu yüzden etiketler her zaman metin düğümüyle oluşturulur.

export function metinOgesi(metin: string, sinif?: string): HTMLElement {
  const el = document.createElement('span');
  if (sinif) el.className = sinif;
  el.textContent = metin;
  return el;
}

/** Satırlardan oluşan etiket; her satır düz metin, `kalin` satırlar kalın yazılır. */
export function satirliOge(satirlar: { metin: string; kalin?: boolean }[], sinif?: string): HTMLElement {
  const kap = document.createElement('div');
  if (sinif) kap.className = sinif;
  satirlar.forEach((s, i) => {
    if (i > 0) kap.appendChild(document.createElement('br'));
    const el = document.createElement(s.kalin ? 'b' : 'span');
    el.textContent = s.metin;
    kap.appendChild(el);
  });
  return kap;
}
