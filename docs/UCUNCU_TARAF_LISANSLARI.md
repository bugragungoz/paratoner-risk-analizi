# Üçüncü taraf bileşenler ve lisansları

Programın ve Keşif saha uygulamasının dağıtılan sürümlerine giren bileşenler (geliştirme araçları
hariç). Liste bağımlılık kilit dosyalarından ve Keşif'in Gradle bağımlılıklarından üretilmiştir
(`package-lock.json`, `src-tauri/Cargo.lock`, `saha/src-tauri/Cargo.lock`); her bileşenin lisans
metni kendi paketinde ve kaynak deposunda bulunur.

Notlar:

- `jsts` ve `@turf/jsts` çift lisanslıdır (EDL-1.0 ya da EPL-1.0); bu programda EDL-1.0
  (BSD-3-Clause eşdeğeri) koşullarıyla kullanılır.
- Çift ya da çok lisanslı Rust bileşenleri ("MIT OR Apache-2.0" gibi) sunulan seçeneklerden biriyle,
  varsa MIT koşullarıyla kullanılır.
- Yazı tipleri (Geist, JetBrains Mono, Carlito) SIL Open Font License 1.1 altındadır.
- Google Play hizmetleri kitaplıkları (`com.google.android.gms`) açık kaynak değildir; yalnızca
  Keşif'in Android sürümünde, telefonun konum hizmetine erişmek için bulunur ve Google'ın Android
  SDK koşullarıyla dağıtılır. Masaüstü programında yer almaz. Bu birleşim için programın lisansı GPL
  madde 7 kapsamında ek izin verir ([NOTICE.md](../NOTICE.md), madde 3).
- Bunlar dışındaki bütün bileşenler GPL-3.0-or-later ile bağdaşır.

## JavaScript bileşenleri (251)

Masaüstü programı ve Keşif aynı JavaScript paketlerinden yararlanır; Keşif bunların bir bölümünü
içerir.

| Bileşen | Lisans |
|---|---|
| @expo-google-fonts/carlito@0.4.1 | MIT AND OFL-1.1 |
| @floating-ui/core@1.8.0 | MIT |
| @floating-ui/dom@1.8.0 | MIT |
| @floating-ui/react-dom@2.1.9 | MIT |
| @floating-ui/utils@0.2.12 | MIT |
| @fontsource/geist@5.3.0 | OFL-1.1 |
| @fontsource/jetbrains-mono@5.3.0 | OFL-1.1 |
| @noble/ciphers@1.3.0 | MIT |
| @noble/hashes@1.8.0 | MIT |
| @radix-ui/primitive@1.1.7 | MIT |
| @radix-ui/react-alert-dialog@1.1.23 | MIT |
| @radix-ui/react-arrow@1.1.15 | MIT |
| @radix-ui/react-compose-refs@1.1.5 | MIT |
| @radix-ui/react-context@1.2.2 | MIT |
| @radix-ui/react-dialog@1.1.23 | MIT |
| @radix-ui/react-dismissable-layer@1.1.19 | MIT |
| @radix-ui/react-focus-guards@1.1.6 | MIT |
| @radix-ui/react-focus-scope@1.1.16 | MIT |
| @radix-ui/react-id@1.1.4 | MIT |
| @radix-ui/react-popover@1.1.23 | MIT |
| @radix-ui/react-popper@1.3.7 | MIT |
| @radix-ui/react-portal@1.1.17 | MIT |
| @radix-ui/react-presence@1.1.10 | MIT |
| @radix-ui/react-primitive@2.1.10 | MIT |
| @radix-ui/react-slot@1.3.3 | MIT |
| @radix-ui/react-switch@1.3.7 | MIT |
| @radix-ui/react-use-callback-ref@1.1.4 | MIT |
| @radix-ui/react-use-controllable-state@1.2.6 | MIT |
| @radix-ui/react-use-effect-event@0.0.5 | MIT |
| @radix-ui/react-use-layout-effect@1.1.4 | MIT |
| @radix-ui/react-use-rect@1.1.4 | MIT |
| @radix-ui/react-use-size@1.1.4 | MIT |
| @radix-ui/rect@1.1.3 | MIT |
| @swc/helpers@0.5.23 | Apache-2.0 |
| @tauri-apps/api@2.12.5 | Apache-2.0 OR MIT |
| @tauri-apps/plugin-clipboard-manager@2.5.0 | MIT OR Apache-2.0 |
| @tauri-apps/plugin-dialog@2.7.2 | MIT OR Apache-2.0 |
| @tauri-apps/plugin-fs@2.5.1 | MIT OR Apache-2.0 |
| @tauri-apps/plugin-geolocation@2.5.0 | MIT OR Apache-2.0 |
| @tauri-apps/plugin-opener@2.7.3 | MIT OR Apache-2.0 |
| @tauri-apps/plugin-shell@2.3.5 | MIT OR Apache-2.0 |
| @turf/along@7.4.0 | MIT |
| @turf/angle@7.4.0 | MIT |
| @turf/area@7.4.0 | MIT |
| @turf/bbox-clip@7.4.0 | MIT |
| @turf/bbox-polygon@7.4.0 | MIT |
| @turf/bbox@7.4.0 | MIT |
| @turf/bearing@7.4.0 | MIT |
| @turf/bezier-spline@7.4.0 | MIT |
| @turf/boolean-clockwise@7.4.0 | MIT |
| @turf/boolean-concave@7.4.0 | MIT |
| @turf/boolean-contains@7.4.0 | MIT |
| @turf/boolean-crosses@7.4.0 | MIT |
| @turf/boolean-disjoint@7.4.0 | MIT |
| @turf/boolean-equal@7.4.0 | MIT |
| @turf/boolean-intersects@7.4.0 | MIT |
| @turf/boolean-overlap@7.4.0 | MIT |
| @turf/boolean-parallel@7.4.0 | MIT |
| @turf/boolean-point-in-polygon@7.4.0 | MIT |
| @turf/boolean-point-on-line@7.4.0 | MIT |
| @turf/boolean-touches@7.4.0 | MIT |
| @turf/boolean-valid@7.4.0 | MIT |
| @turf/boolean-within@7.4.0 | MIT |
| @turf/buffer@7.4.0 | MIT |
| @turf/center-mean@7.4.0 | MIT |
| @turf/center-median@7.4.0 | MIT |
| @turf/center-of-mass@7.4.0 | MIT |
| @turf/center@7.4.0 | MIT |
| @turf/centroid@7.4.0 | MIT |
| @turf/circle@7.4.0 | MIT |
| @turf/clean-coords@7.4.0 | MIT |
| @turf/clone@7.4.0 | MIT |
| @turf/clusters-dbscan@7.4.0 | MIT |
| @turf/clusters-kmeans@7.4.0 | MIT |
| @turf/clusters@7.4.0 | MIT |
| @turf/collect@7.4.0 | MIT |
| @turf/combine@7.4.0 | MIT |
| @turf/concave@7.4.0 | MIT |
| @turf/convex@7.4.0 | MIT |
| @turf/destination@7.4.0 | MIT |
| @turf/difference@7.4.0 | MIT |
| @turf/directional-mean@7.4.0 | MIT |
| @turf/dissolve@7.4.0 | MIT |
| @turf/distance-weight@7.4.0 | MIT |
| @turf/distance@7.4.0 | MIT |
| @turf/ellipse@7.4.0 | MIT |
| @turf/envelope@7.4.0 | MIT |
| @turf/explode@7.4.0 | MIT |
| @turf/flatten@7.4.0 | MIT |
| @turf/flip@7.4.0 | MIT |
| @turf/geojson-rbush@7.4.0 | MIT |
| @turf/great-circle@7.4.0 | MIT |
| @turf/helpers@7.4.0 | MIT |
| @turf/hex-grid@7.4.0 | MIT |
| @turf/interpolate@7.4.0 | MIT |
| @turf/intersect@7.4.0 | MIT |
| @turf/invariant@7.4.0 | MIT |
| @turf/isobands@7.4.0 | MIT |
| @turf/isolines@7.4.0 | MIT |
| @turf/jsts@2.7.2 | (EDL-1.0 OR EPL-1.0) |
| @turf/kinks@7.4.0 | MIT |
| @turf/length@7.4.0 | MIT |
| @turf/line-arc@7.4.0 | MIT |
| @turf/line-chunk@7.4.0 | MIT |
| @turf/line-intersect@7.4.0 | MIT |
| @turf/line-offset@7.4.0 | MIT |
| @turf/line-overlap@7.4.0 | MIT |
| @turf/line-segment@7.4.0 | MIT |
| @turf/line-slice-along@7.4.0 | MIT |
| @turf/line-slice@7.4.0 | MIT |
| @turf/line-split@7.4.0 | MIT |
| @turf/line-to-polygon@7.4.0 | MIT |
| @turf/mask@7.4.0 | MIT |
| @turf/meta@7.4.0 | MIT |
| @turf/midpoint@7.4.0 | MIT |
| @turf/moran-index@7.4.0 | MIT |
| @turf/nearest-neighbor-analysis@7.4.0 | MIT |
| @turf/nearest-point-on-line@7.4.0 | MIT |
| @turf/nearest-point-to-line@7.4.0 | MIT |
| @turf/nearest-point@7.4.0 | MIT |
| @turf/planepoint@7.4.0 | MIT |
| @turf/point-grid@7.4.0 | MIT |
| @turf/point-on-feature@7.4.0 | MIT |
| @turf/point-to-line-distance@7.4.0 | MIT |
| @turf/point-to-polygon-distance@7.4.0 | MIT |
| @turf/points-within-polygon@7.4.0 | MIT |
| @turf/polygon-smooth@7.4.0 | MIT |
| @turf/polygon-tangents@7.4.0 | MIT |
| @turf/polygon-to-line@7.4.0 | MIT |
| @turf/polygonize@7.4.0 | MIT |
| @turf/projection@7.4.0 | MIT |
| @turf/quadrat-analysis@7.4.0 | MIT |
| @turf/random@7.4.0 | MIT |
| @turf/rectangle-grid@7.4.0 | MIT |
| @turf/rewind@7.4.0 | MIT |
| @turf/rhumb-bearing@7.4.0 | MIT |
| @turf/rhumb-destination@7.4.0 | MIT |
| @turf/rhumb-distance@7.4.0 | MIT |
| @turf/sample@7.4.0 | MIT |
| @turf/sector@7.4.0 | MIT |
| @turf/shortest-path@7.4.0 | MIT |
| @turf/simplify@7.4.0 | MIT |
| @turf/square-grid@7.4.0 | MIT |
| @turf/square@7.4.0 | MIT |
| @turf/standard-deviational-ellipse@7.4.0 | MIT |
| @turf/tag@7.4.0 | MIT |
| @turf/tesselate@7.4.0 | MIT |
| @turf/tin@7.4.0 | MIT |
| @turf/transform-rotate@7.4.0 | MIT |
| @turf/transform-scale@7.4.0 | MIT |
| @turf/transform-translate@7.4.0 | MIT |
| @turf/triangle-grid@7.4.0 | MIT |
| @turf/truncate@7.4.0 | MIT |
| @turf/turf@7.4.0 | MIT |
| @turf/union@7.4.0 | MIT |
| @turf/unkink-polygon@7.4.0 | MIT |
| @turf/voronoi@7.4.0 | MIT |
| @types/d3-voronoi@1.1.12 | MIT |
| @types/earcut@2.1.4 | MIT |
| @types/geojson@7946.0.16 | MIT |
| @types/kdbush@3.0.5 | MIT |
| @types/node@25.9.5 | MIT |
| arc@0.2.0 | BSD-3-Clause |
| aria-hidden@1.2.6 | MIT |
| base64-arraybuffer@1.0.2 | MIT |
| base64-js@0.0.8 | MIT |
| base64-js@1.5.1 | MIT |
| bignumber.js@9.3.1 | MIT |
| brotli@1.3.3 | MIT |
| browserify-zlib@0.2.0 | MIT |
| clone@2.1.2 | MIT |
| commander@2.20.3 | MIT |
| concaveman@1.2.1 | ISC |
| core-util-is@1.0.3 | MIT |
| css-line-break@2.1.0 | MIT |
| d3-array@2.12.1 | BSD-3-Clause |
| d3-geo@2.0.2 | BSD-3-Clause |
| d3-voronoi@1.1.2 | BSD-3-Clause |
| detect-node-es@1.1.0 | MIT |
| dfa@1.2.0 | MIT |
| docx@9.7.1 | MIT |
| earcut@2.2.4 | ISC |
| fast-deep-equal@3.1.3 | MIT |
| fontkit@2.0.4 | MIT |
| geojson-equality-ts@1.0.2 | MIT |
| geojson-polygon-self-intersections@1.2.2 | MIT |
| get-nonce@1.0.1 | MIT |
| hash.js@1.1.7 | MIT |
| html2canvas@1.4.1 | MIT |
| idb-keyval@6.3.0 | Apache-2.0 |
| immediate@3.0.6 | MIT |
| inherits@2.0.4 | ISC |
| internmap@1.0.1 | ISC |
| isarray@1.0.0 | MIT |
| js-md5@0.8.3 | MIT |
| jsts@2.7.1 | (EDL-1.0 OR EPL-1.0) |
| jszip@3.10.1 | (MIT OR GPL-3.0-or-later) |
| leaflet@1.9.4 | BSD-2-Clause |
| lie@3.3.0 | MIT |
| linebreak@1.1.0 | MIT |
| lucide-react@1.43.0 | ISC |
| mgrs@1.0.0 | MIT |
| minimalistic-assert@1.0.1 | ISC |
| nanoid@5.1.16 | MIT |
| pako@0.2.9 | MIT |
| pako@1.0.11 | (MIT AND Zlib) |
| pdfkit@0.19.1 | MIT |
| pdfmake@0.3.11 | MIT |
| png-js@1.1.0 | MIT |
| point-in-polygon-hao@1.2.4 | MIT |
| point-in-polygon@1.1.0 | MIT |
| polyclip-ts@0.16.8 | MIT |
| process-nextick-args@2.0.1 | MIT |
| proj4@2.23.0 | MIT |
| quickselect@1.1.1 | ISC |
| quickselect@2.0.0 | ISC |
| rbush@2.0.2 | MIT |
| rbush@3.0.1 | MIT |
| react-dom@19.2.8 | MIT |
| react-remove-scroll-bar@2.3.8 | MIT |
| react-remove-scroll@2.7.2 | MIT |
| react-style-singleton@2.2.3 | MIT |
| react@19.2.8 | MIT |
| readable-stream@2.3.8 | MIT |
| restructure@3.0.2 | MIT |
| robust-predicates@2.0.4 | Unlicense |
| robust-predicates@3.0.3 | Unlicense |
| safe-buffer@5.1.2 | MIT |
| sax@1.6.1 | BlueOak-1.0.0 |
| scheduler@0.27.0 | MIT |
| setimmediate@1.0.5 | MIT |
| skmeans@0.9.7 | MIT |
| splaytree-ts@1.0.2 | BDS-3-Clause |
| string_decoder@1.1.1 | MIT |
| text-segmentation@1.0.3 | MIT |
| tiny-inflate@1.0.3 | MIT |
| tinyqueue@2.0.3 | ISC |
| topojson-client@3.1.0 | ISC |
| topojson-server@3.0.1 | ISC |
| tslib@2.8.1 | 0BSD |
| undici-types@7.24.6 | MIT |
| unicode-properties@1.4.1 | MIT |
| unicode-trie@2.0.0 | MIT |
| use-callback-ref@1.3.3 | MIT |
| use-sidecar@1.1.3 | MIT |
| util-deprecate@1.0.2 | MIT |
| utrie@1.0.2 | MIT |
| wkt-parser@1.9.0 | MIT |
| xml-js@1.6.11 | MIT |
| xml@1.0.1 | MIT |
| xmldoc@2.0.3 | MIT |

## Rust bileşenleri: masaüstü programı (296)

| Bileşen | Lisans |
|---|---|
| adler2@2.0.1 | 0BSD OR MIT OR Apache-2.0 |
| aho-corasick@1.1.5 | Unlicense OR MIT |
| alloc-no-stdlib@3.0.0 | BSD-3-Clause |
| alloc-stdlib@0.3.0 | BSD-3-Clause |
| anyhow@1.0.104 | MIT OR Apache-2.0 |
| atomic-waker@1.1.2 | Apache-2.0 OR MIT |
| base64@0.22.1 | MIT OR Apache-2.0 |
| base64@0.23.1 | MIT OR Apache-2.0 |
| bit-set@0.8.0 | Apache-2.0 OR MIT |
| bit-vec@0.8.0 | Apache-2.0 OR MIT |
| bitflags@1.3.2 | MIT/Apache-2.0 |
| bitflags@2.13.1 | MIT OR Apache-2.0 |
| block-buffer@0.12.1 | MIT OR Apache-2.0 |
| brotli-decompressor@6.4.0 | BSD-3-Clause/MIT |
| brotli@9.1.3 | BSD-3-Clause AND MIT |
| bs58@0.5.1 | MIT/Apache-2.0 |
| byteorder@1.5.0 | Unlicense OR MIT |
| bytes@1.12.1 | MIT |
| camino@1.2.5 | MIT OR Apache-2.0 |
| cargo-platform@0.1.9 | MIT OR Apache-2.0 |
| cargo_metadata@0.19.2 | MIT |
| cfb@0.14.0 | MIT |
| cfg-if@1.0.4 | MIT OR Apache-2.0 |
| chacha20@0.10.2 | MIT OR Apache-2.0 |
| chrono@0.4.45 | MIT OR Apache-2.0 |
| const-oid@0.10.3 | Apache-2.0 OR MIT |
| cookie@0.18.2 | MIT OR Apache-2.0 |
| core_detect@1.0.0 | MIT/Apache-2.0 |
| cpufeatures@0.3.1 | MIT OR Apache-2.0 |
| crc32fast@1.5.1 | MIT OR Apache-2.0 |
| crossbeam-channel@0.5.17 | MIT OR Apache-2.0 |
| crossbeam-utils@0.8.23 | MIT OR Apache-2.0 |
| crypto-common@0.2.2 | MIT OR Apache-2.0 |
| cssparser-macros@0.7.1 | MPL-2.0 |
| cssparser@0.37.0 | MPL-2.0 |
| ctor@1.0.14 | Apache-2.0 OR MIT |
| darling@0.24.1 | MIT |
| darling_core@0.24.1 | MIT |
| darling_macro@0.24.1 | MIT |
| defmt-macros@1.1.1 | MIT OR Apache-2.0 |
| defmt-parser@1.0.0 | MIT OR Apache-2.0 |
| defmt@1.1.1 | MIT OR Apache-2.0 |
| deranged@0.5.8 | MIT OR Apache-2.0 |
| derive_more-impl@2.1.1 | MIT |
| derive_more@2.1.1 | MIT |
| digest@0.11.3 | MIT OR Apache-2.0 |
| dirs-sys@0.5.0 | MIT OR Apache-2.0 |
| dirs@7.0.0 | MIT OR Apache-2.0 |
| displaydoc@0.2.7 | MIT OR Apache-2.0 |
| dom_query@0.28.0 | MIT |
| dpi@0.1.2 | Apache-2.0 AND MIT |
| dtoa-short@0.3.5 | MPL-2.0 |
| dtoa@1.0.11 | MIT OR Apache-2.0 |
| dunce@1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 |
| dyn-clone@1.0.20 | MIT OR Apache-2.0 |
| encoding_rs@0.8.40 | (Apache-2.0 OR MIT) AND BSD-3-Clause |
| equivalent@1.0.2 | Apache-2.0 OR MIT |
| erased-serde@0.4.10 | MIT OR Apache-2.0 |
| fastrand@2.5.0 | Apache-2.0 OR MIT |
| fdeflate@0.3.7 | MIT OR Apache-2.0 |
| fern@0.7.1 | MIT |
| flate2@1.1.10 | MIT OR Apache-2.0 |
| fnv@1.0.7 | Apache-2.0 / MIT |
| foldhash@0.2.0 | Zlib |
| form_urlencoded@1.2.2 | MIT OR Apache-2.0 |
| futures-channel@0.3.34 | MIT OR Apache-2.0 |
| futures-core@0.3.34 | MIT OR Apache-2.0 |
| futures-io@0.3.34 | MIT OR Apache-2.0 |
| futures-macro@0.3.34 | MIT OR Apache-2.0 |
| futures-sink@0.3.34 | MIT OR Apache-2.0 |
| futures-task@0.3.34 | MIT OR Apache-2.0 |
| futures-util@0.3.34 | MIT OR Apache-2.0 |
| getrandom@0.2.17 | MIT OR Apache-2.0 |
| getrandom@0.3.4 | MIT OR Apache-2.0 |
| getrandom@0.4.3 | MIT OR Apache-2.0 |
| glob@0.3.4 | MIT OR Apache-2.0 |
| hashbrown@0.12.3 | MIT OR Apache-2.0 |
| hashbrown@0.17.1 | MIT OR Apache-2.0 |
| heck@0.5.0 | MIT OR Apache-2.0 |
| hex@0.4.3 | MIT OR Apache-2.0 |
| html5ever@0.39.0 | MIT OR Apache-2.0 |
| http-body-util@0.1.5 | MIT |
| http-body@1.1.0 | MIT |
| http@1.5.0 | MIT OR Apache-2.0 |
| httparse@1.10.1 | MIT OR Apache-2.0 |
| hybrid-array@0.4.15 | MIT OR Apache-2.0 |
| hyper-rustls@0.27.9 | Apache-2.0 OR ISC OR MIT |
| hyper-util@0.1.20 | MIT |
| hyper@1.11.1 | MIT |
| ico@0.6.0 | MIT |
| icu_collections@2.3.0 | Unicode-3.0 |
| icu_locale_core@2.3.0 | Unicode-3.0 |
| icu_normalizer@2.3.0 | Unicode-3.0 |
| icu_normalizer_data@2.3.0 | Unicode-3.0 |
| icu_properties@2.3.0 | Unicode-3.0 |
| icu_properties_data@2.3.0 | Unicode-3.0 |
| icu_provider@2.3.1 | Unicode-3.0 |
| ident_case@1.0.1 | MIT/Apache-2.0 |
| idna@1.1.0 | MIT OR Apache-2.0 |
| idna_adapter@1.2.2 | Apache-2.0 OR MIT |
| indexmap@1.9.3 | Apache-2.0 OR MIT |
| indexmap@2.14.2 | Apache-2.0 OR MIT |
| infer@0.22.0 | MIT |
| ipnet@2.12.2 | MIT OR Apache-2.0 |
| itoa@1.0.18 | MIT OR Apache-2.0 |
| jiff-core@0.1.0 | Unlicense OR MIT |
| jiff-tzdb-platform@0.1.3 | Unlicense OR MIT |
| jiff-tzdb@0.1.8 | Unlicense OR MIT |
| jiff@0.2.35 | Unlicense OR MIT |
| json-patch@4.2.0 | MIT/Apache-2.0 |
| jsonptr@0.7.1 | MIT OR Apache-2.0 |
| keyboard-types@0.8.3 | MIT OR Apache-2.0 |
| keyring@3.6.3 | MIT OR Apache-2.0 |
| libc@0.2.189 | MIT OR Apache-2.0 |
| litemap@0.8.3 | Unicode-3.0 |
| lock_api@0.4.14 | MIT OR Apache-2.0 |
| log@0.4.34 | MIT OR Apache-2.0 |
| lru-slab@0.1.2 | MIT OR Apache-2.0 OR Zlib |
| markup5ever@0.39.0 | MIT OR Apache-2.0 |
| memchr@2.8.3 | Unlicense OR MIT |
| mime@0.3.17 | MIT OR Apache-2.0 |
| miniz_oxide@0.8.9 | MIT OR Zlib OR Apache-2.0 |
| miniz_oxide@0.9.1 | MIT OR Zlib OR Apache-2.0 |
| mio@1.2.3 | MIT |
| muda@0.20.0 | Apache-2.0 OR MIT |
| multiversion-macros@0.8.0 | MIT OR Apache-2.0 |
| multiversion@0.8.0 | MIT OR Apache-2.0 |
| multiversion_no_op@1.0.0 | Apache-2.0 OR MIT |
| new_debug_unreachable@1.0.6 | MIT |
| num-conv@0.2.2 | MIT OR Apache-2.0 |
| num-traits@0.2.19 | MIT OR Apache-2.0 |
| once_cell@1.21.4 | MIT OR Apache-2.0 |
| open@5.4.3 | MIT |
| option-ext@0.2.0 | MPL-2.0 |
| os_pipe@1.2.3 | MIT |
| parking_lot@0.12.5 | MIT OR Apache-2.0 |
| parking_lot_core@0.9.12 | MIT OR Apache-2.0 |
| percent-encoding@2.3.2 | MIT OR Apache-2.0 |
| phf@0.13.1 | MIT |
| phf_generator@0.13.1 | MIT |
| phf_macros@0.13.1 | MIT |
| phf_shared@0.13.1 | MIT |
| pin-project-lite@0.2.17 | Apache-2.0 OR MIT |
| plist@1.10.1 | MIT |
| png@0.18.1 | MIT OR Apache-2.0 |
| potential_utf@0.1.6 | Unicode-3.0 |
| powerfmt@0.2.0 | MIT OR Apache-2.0 |
| precomputed-hash@0.1.1 | MIT |
| proc-macro2@1.0.107 | MIT OR Apache-2.0 |
| quick-xml@0.42.0 | MIT |
| quinn-proto@0.11.17 | MIT OR Apache-2.0 |
| quinn-udp@0.5.15 | MIT OR Apache-2.0 |
| quinn@0.11.11 | MIT OR Apache-2.0 |
| quote@1.0.47 | MIT OR Apache-2.0 |
| rand@0.10.2 | MIT OR Apache-2.0 |
| rand_core@0.10.1 | MIT OR Apache-2.0 |
| rand_pcg@0.10.2 | MIT OR Apache-2.0 |
| raw-window-handle@0.6.2 | MIT OR Apache-2.0 OR Zlib |
| ref-cast-impl@1.0.27 | MIT OR Apache-2.0 |
| ref-cast@1.0.27 | MIT OR Apache-2.0 |
| regex-automata@0.4.18 | MIT OR Apache-2.0 |
| regex-syntax@0.8.11 | MIT OR Apache-2.0 |
| regex@1.13.1 | MIT OR Apache-2.0 |
| reqwest@0.12.28 | MIT OR Apache-2.0 |
| rfd@0.16.0 | MIT |
| ring@0.17.14 | Apache-2.0 AND ISC |
| rustc-hash@2.1.3 | Apache-2.0 OR MIT |
| rustls-pki-types@1.15.1 | MIT OR Apache-2.0 |
| rustls-webpki@0.103.15 | ISC |
| rustls@0.23.44 | Apache-2.0 OR ISC OR MIT |
| ryu@1.0.23 | Apache-2.0 OR BSL-1.0 |
| same-file@1.0.6 | Unlicense/MIT |
| schemars@0.8.22 | MIT |
| schemars@0.9.0 | MIT |
| schemars@1.2.2 | MIT |
| schemars_derive@0.8.22 | MIT |
| scopeguard@1.2.0 | MIT OR Apache-2.0 |
| selectors@0.38.0 | MPL-2.0 |
| semver@1.0.28 | MIT OR Apache-2.0 |
| serde-untagged@0.1.9 | MIT OR Apache-2.0 |
| serde@1.0.229 | MIT OR Apache-2.0 |
| serde_core@1.0.229 | MIT OR Apache-2.0 |
| serde_derive@1.0.229 | MIT OR Apache-2.0 |
| serde_derive_internals@0.29.1 | MIT OR Apache-2.0 |
| serde_json@1.0.151 | MIT OR Apache-2.0 |
| serde_repr@0.1.21 | MIT OR Apache-2.0 |
| serde_spanned@1.1.1 | MIT OR Apache-2.0 |
| serde_urlencoded@0.7.1 | MIT/Apache-2.0 |
| serde_with@3.23.0 | MIT OR Apache-2.0 |
| serde_with_macros@3.23.0 | MIT OR Apache-2.0 |
| serialize-to-javascript-impl@0.1.2 | MIT OR Apache-2.0 |
| serialize-to-javascript@0.1.2 | MIT OR Apache-2.0 |
| servo_arc@0.4.3 | MIT OR Apache-2.0 |
| sha2@0.11.1 | MIT OR Apache-2.0 |
| shared_child@1.1.2 | MIT |
| simd-adler32@0.3.10 | MIT |
| simdutf8@0.1.5 | MIT OR Apache-2.0 |
| siphasher@1.0.3 | MIT/Apache-2.0 |
| slab@0.4.12 | MIT |
| smallvec@1.16.0 | MIT OR Apache-2.0 |
| socket2@0.6.5 | MIT OR Apache-2.0 |
| softbuffer@0.4.8 | MIT OR Apache-2.0 |
| stable_deref_trait@1.2.1 | MIT OR Apache-2.0 |
| string_cache@0.9.0 | MIT OR Apache-2.0 |
| strsim@0.11.1 | MIT |
| subtle@2.6.1 | BSD-3-Clause |
| syn@2.0.119 | MIT OR Apache-2.0 |
| syn@3.0.5 | MIT OR Apache-2.0 |
| sync_wrapper@1.0.2 | Apache-2.0 |
| synstructure@0.13.2 | MIT |
| tao@0.37.3 | Apache-2.0 |
| target-features@0.1.6 | MIT OR Apache-2.0 |
| tauri-codegen@2.7.6 | Apache-2.0 OR MIT |
| tauri-macros@2.7.6 | Apache-2.0 OR MIT |
| tauri-plugin-dialog@2.7.3 | Apache-2.0 OR MIT |
| tauri-plugin-fs@2.5.2 | Apache-2.0 OR MIT |
| tauri-plugin-log@2.9.1 | Apache-2.0 OR MIT |
| tauri-plugin-shell@2.3.6 | Apache-2.0 OR MIT |
| tauri-plugin-single-instance@2.4.5 | Apache-2.0 OR MIT |
| tauri-runtime-wry@2.12.5 | Apache-2.0 OR MIT |
| tauri-runtime@2.12.4 | Apache-2.0 OR MIT |
| tauri-utils@2.10.4 | Apache-2.0 OR MIT |
| tauri@2.12.7 | Apache-2.0 OR MIT |
| tendril@0.5.1 | MIT OR Apache-2.0 |
| thiserror-impl@2.0.20 | MIT OR Apache-2.0 |
| thiserror@2.0.20 | MIT OR Apache-2.0 |
| time-core@0.1.9 | MIT OR Apache-2.0 |
| time-macros@0.2.32 | MIT OR Apache-2.0 |
| time@0.3.55 | MIT OR Apache-2.0 |
| tinystr@0.8.4 | Unicode-3.0 |
| tinyvec@1.13.2 | Zlib OR Apache-2.0 OR MIT |
| tinyvec_macros@0.1.1 | MIT OR Apache-2.0 OR Zlib |
| tokio-macros@2.7.2 | MIT |
| tokio-rustls@0.26.5 | MIT OR Apache-2.0 |
| tokio@1.53.1 | MIT |
| toml@1.1.5+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_datetime@1.1.1+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_parser@1.1.3+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_writer@1.1.2+spec-1.1.0 | MIT OR Apache-2.0 |
| tower-http@0.6.11 | MIT |
| tower-layer@0.3.3 | MIT |
| tower-service@0.3.3 | MIT |
| tower@0.5.3 | MIT |
| tracing-attributes@0.1.31 | MIT |
| tracing-core@0.1.36 | MIT |
| tracing@0.1.44 | MIT |
| tray-icon@0.25.1 | MIT OR Apache-2.0 |
| try-lock@0.2.5 | MIT |
| typeid@1.0.3 | MIT OR Apache-2.0 |
| typenum@1.20.1 | MIT OR Apache-2.0 |
| unicode-ident@1.0.24 | (MIT OR Apache-2.0) AND Unicode-3.0 |
| unicode-segmentation@1.13.3 | MIT OR Apache-2.0 |
| untrusted@0.9.0 | ISC |
| url@2.5.8 | MIT OR Apache-2.0 |
| urlpattern@0.6.0 | MIT |
| utf8_iter@1.0.4 | Apache-2.0 OR MIT |
| uuid@1.26.0 | Apache-2.0 OR MIT |
| walkdir@2.5.0 | Unlicense/MIT |
| want@0.3.1 | MIT |
| web-time@1.1.0 | MIT OR Apache-2.0 |
| web_atoms@0.2.6 | MIT OR Apache-2.0 |
| webpki-roots@1.0.9 | CDLA-Permissive-2.0 |
| webview2-com-macros@0.8.1 | MIT |
| webview2-com-sys@0.39.1 | MIT |
| webview2-com@0.39.1 | MIT |
| winapi-util@0.1.11 | Unlicense OR MIT |
| window-vibrancy@0.8.1 | Apache-2.0 OR MIT |
| windows-collections@0.3.2 | MIT OR Apache-2.0 |
| windows-core@0.62.2 | MIT OR Apache-2.0 |
| windows-future@0.3.2 | MIT OR Apache-2.0 |
| windows-implement@0.60.2 | MIT OR Apache-2.0 |
| windows-interface@0.59.3 | MIT OR Apache-2.0 |
| windows-link@0.2.1 | MIT OR Apache-2.0 |
| windows-numerics@0.3.1 | MIT OR Apache-2.0 |
| windows-result@0.4.1 | MIT OR Apache-2.0 |
| windows-strings@0.5.1 | MIT OR Apache-2.0 |
| windows-sys@0.60.2 | MIT OR Apache-2.0 |
| windows-sys@0.61.2 | MIT OR Apache-2.0 |
| windows-targets@0.53.5 | MIT OR Apache-2.0 |
| windows-threading@0.2.1 | MIT OR Apache-2.0 |
| windows-version@0.1.7 | MIT OR Apache-2.0 |
| windows@0.62.2 | MIT OR Apache-2.0 |
| windows_x86_64_msvc@0.53.1 | MIT OR Apache-2.0 |
| winnow@1.0.4 | MIT |
| writeable@0.6.4 | Unicode-3.0 |
| wry@0.57.3 | Apache-2.0 OR MIT |
| yoke-derive@0.8.2 | Unicode-3.0 |
| yoke@0.8.3 | Unicode-3.0 |
| zerofrom-derive@0.1.7 | Unicode-3.0 |
| zerofrom@0.1.8 | Unicode-3.0 |
| zeroize@1.9.0 | Apache-2.0 OR MIT |
| zerotrie@0.2.5 | Unicode-3.0 |
| zerovec-derive@0.11.6 | Unicode-3.0 |
| zerovec@0.11.8 | Unicode-3.0 |
| zlib-rs@0.6.7 | Zlib |
| zmij@1.0.23 | MIT |

## Rust bileşenleri: Keşif (111)

Keşif'in Android sürümüne giren ve yukarıdaki listede aynı sürümüyle yer almayan bileşenler.

| Bileşen | Lisans |
|---|---|
| android_system_properties@0.1.6 | MIT OR Apache-2.0 |
| bit-set@0.11.1 | Apache-2.0 OR MIT |
| bit-vec@0.10.2 | Apache-2.0 OR MIT |
| bitflags@2.13.2 | MIT OR Apache-2.0 |
| block-buffer@0.10.4 | MIT OR Apache-2.0 |
| brotli-decompressor@6.3.2 | BSD-3-Clause/MIT |
| bytes@1.12.2 | MIT |
| camino@1.2.6 | MIT OR Apache-2.0 |
| cesu8@1.1.0 | Apache-2.0/MIT |
| cfg-if@1.0.5 | MIT OR Apache-2.0 |
| combine@4.6.9 | MIT |
| cpufeatures@0.2.17 | MIT OR Apache-2.0 |
| crc32fast@1.5.5 | MIT OR Apache-2.0 |
| crypto-common@0.1.7 | MIT OR Apache-2.0 |
| cssparser@0.38.0 | MPL-2.0 |
| deranged@0.5.9 | MIT OR Apache-2.0 |
| digest@0.10.7 | MIT OR Apache-2.0 |
| dom_query@0.29.0 | MIT |
| equivalent@1.0.3 | Apache-2.0 OR MIT |
| erased-serde@0.4.11 | MIT OR Apache-2.0 |
| flate2@1.1.11 | MIT OR Apache-2.0 |
| generic-array@0.14.7 | MIT |
| html5ever@0.40.1 | MIT OR Apache-2.0 |
| hyper-util@0.1.21 | MIT |
| hyper@1.12.0 | MIT |
| iana-time-zone@0.1.65 | MIT OR Apache-2.0 |
| icu_collections@2.4.0 | Unicode-3.0 |
| icu_locale_core@2.4.0 | Unicode-3.0 |
| icu_normalizer@2.4.0 | Unicode-3.0 |
| icu_normalizer_data@2.4.0 | Unicode-3.0 |
| icu_properties@2.4.0 | Unicode-3.0 |
| icu_properties_data@2.4.0 | Unicode-3.0 |
| icu_provider@2.4.0 | Unicode-3.0 |
| is-docker@0.2.0 | MIT |
| is-wsl@0.4.0 | MIT |
| itoa@1.0.19 | MIT OR Apache-2.0 |
| jiff-core@0.1.8 | Unlicense OR MIT |
| jiff-core@1.0.1 | Unlicense OR MIT |
| jiff@0.2.46 | Unlicense OR MIT |
| jiff@1.0.1 | Unlicense OR MIT |
| jni-sys-macros@0.4.1 | MIT OR Apache-2.0 |
| jni-sys@0.3.1 | MIT OR Apache-2.0 |
| jni-sys@0.4.1 | MIT OR Apache-2.0 |
| jni@0.21.1 | MIT/Apache-2.0 |
| libc@0.2.191 | MIT OR Apache-2.0 |
| log@0.4.35 | MIT OR Apache-2.0 |
| markup5ever@0.40.0 | MIT OR Apache-2.0 |
| mime@0.3.18 | MIT OR Apache-2.0 |
| mio@1.2.5 | MIT |
| ndk-context@0.1.1 | MIT OR Apache-2.0 |
| ndk-sys@0.6.0+11769913 | MIT OR Apache-2.0 |
| ndk@0.9.0 | MIT OR Apache-2.0 |
| num_enum@0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 |
| num_enum_derive@0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 |
| open@5.4.5 | MIT |
| phf@0.14.0 | MIT |
| phf_generator@0.14.0 | MIT |
| phf_macros@0.14.0 | MIT |
| phf_shared@0.14.0 | MIT |
| pin-project-lite@0.2.18 | Apache-2.0 OR MIT |
| plist@1.10.4 | MIT |
| powerfmt@0.2.1 | MIT OR Apache-2.0 |
| proc-macro-crate@3.5.0 | MIT OR Apache-2.0 |
| regex-automata@0.4.19 | MIT OR Apache-2.0 |
| regex-syntax@0.8.12 | MIT OR Apache-2.0 |
| regex@1.13.2 | MIT OR Apache-2.0 |
| reqwest@0.13.5 | MIT OR Apache-2.0 |
| rustversion@1.0.23 | MIT OR Apache-2.0 |
| schemars@1.2.3 | MIT |
| selectors@0.41.0 | MPL-2.0 |
| serde_json@1.0.154 | MIT OR Apache-2.0 |
| serde_spanned@1.1.3 | MIT OR Apache-2.0 |
| serde_with@3.25.0 | MIT OR Apache-2.0 |
| serde_with_macros@3.25.0 | MIT OR Apache-2.0 |
| servo_arc@0.5.0 | MIT OR Apache-2.0 |
| sha2@0.10.9 | MIT OR Apache-2.0 |
| siphasher@1.0.4 | MIT OR Apache-2.0 |
| smallvec@1.16.6 | MIT OR Apache-2.0 |
| string_cache@0.11.0 | MIT OR Apache-2.0 |
| syn@3.0.10 | MIT OR Apache-2.0 |
| synstructure@0.14.0 | MIT |
| tao-macros@0.1.4 | MIT OR Apache-2.0 |
| tauri-plugin-clipboard-manager@2.5.0 | Apache-2.0 OR MIT |
| tauri-plugin-geolocation@2.5.0 | Apache-2.0 OR MIT |
| tauri-plugin-opener@2.7.3 | Apache-2.0 OR MIT |
| thiserror-impl@1.0.69 | MIT OR Apache-2.0 |
| thiserror-impl@2.0.21 | MIT OR Apache-2.0 |
| thiserror@1.0.69 | MIT OR Apache-2.0 |
| thiserror@2.0.21 | MIT OR Apache-2.0 |
| tinystr@0.8.5 | Unicode-3.0 |
| tinyvec@1.13.3 | Zlib OR Apache-2.0 OR MIT |
| tokio-util@0.7.20 | MIT |
| tokio@1.54.1 | MIT |
| toml@1.2.1+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_datetime@1.1.3+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_edit@0.25.19+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_parser@1.1.5+spec-1.1.0 | MIT OR Apache-2.0 |
| toml_writer@1.2.0+spec-1.1.0 | MIT OR Apache-2.0 |
| unicode-ident@1.0.27 | (MIT OR Apache-2.0) AND Unicode-3.0 |
| utf8_iter@1.1.0 | Apache-2.0 OR MIT |
| utf_types@1.0.0 | Apache-2.0 OR MIT |
| uuid@1.29.3 | Apache-2.0 OR MIT |
| want@0.3.2 | MIT |
| web_atoms@0.3.0 | MIT OR Apache-2.0 |
| winnow@1.0.5 | MIT |
| yoke-derive@0.8.4 | Unicode-3.0 |
| yoke@0.8.4 | Unicode-3.0 |
| zerofrom-derive@0.1.8 | Unicode-3.0 |
| zerovec-derive@0.11.7 | Unicode-3.0 |
| zerovec@0.11.9 | Unicode-3.0 |
| zlib-rs@0.6.8 | Zlib |

## Android kitaplıkları: Keşif (83)

| Bileşen | Lisans |
|---|---|
| androidx.activity:activity-ktx:1.10.1 | Apache-2.0 |
| androidx.activity:activity:1.10.1 | Apache-2.0 |
| androidx.annotation:annotation-experimental:1.4.1 | Apache-2.0 |
| androidx.annotation:annotation-jvm:1.9.1 | Apache-2.0 |
| androidx.annotation:annotation:1.9.1 | Apache-2.0 |
| androidx.appcompat:appcompat-resources:1.7.1 | Apache-2.0 |
| androidx.appcompat:appcompat:1.7.1 | Apache-2.0 |
| androidx.arch.core:core-common:2.2.0 | Apache-2.0 |
| androidx.arch.core:core-runtime:2.2.0 | Apache-2.0 |
| androidx.browser:browser:1.8.0 | Apache-2.0 |
| androidx.cardview:cardview:1.0.0 | Apache-2.0 |
| androidx.collection:collection:1.1.0 | Apache-2.0 |
| androidx.concurrent:concurrent-futures:1.1.0 | Apache-2.0 |
| androidx.constraintlayout:constraintlayout-solver:2.0.1 | Apache-2.0 |
| androidx.constraintlayout:constraintlayout:2.0.1 | Apache-2.0 |
| androidx.coordinatorlayout:coordinatorlayout:1.1.0 | Apache-2.0 |
| androidx.core:core-ktx:1.13.1 | Apache-2.0 |
| androidx.core:core-viewtree:1.0.0 | Apache-2.0 |
| androidx.core:core:1.13.1 | Apache-2.0 |
| androidx.cursoradapter:cursoradapter:1.0.0 | Apache-2.0 |
| androidx.customview:customview:1.1.0 | Apache-2.0 |
| androidx.documentfile:documentfile:1.0.0 | Apache-2.0 |
| androidx.drawerlayout:drawerlayout:1.1.1 | Apache-2.0 |
| androidx.dynamicanimation:dynamicanimation:1.0.0 | Apache-2.0 |
| androidx.emoji2:emoji2-views-helper:1.3.0 | Apache-2.0 |
| androidx.emoji2:emoji2:1.3.0 | Apache-2.0 |
| androidx.fragment:fragment:1.5.4 | Apache-2.0 |
| androidx.interpolator:interpolator:1.0.0 | Apache-2.0 |
| androidx.legacy:legacy-support-core-utils:1.0.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-common-jvm:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-common:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-livedata-core-ktx:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-livedata-core:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-livedata:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-process:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-runtime-android:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-runtime-ktx-android:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-runtime-ktx:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-runtime:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-viewmodel-android:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-viewmodel-ktx:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-viewmodel-savedstate-android:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-viewmodel-savedstate:2.10.0 | Apache-2.0 |
| androidx.lifecycle:lifecycle-viewmodel:2.10.0 | Apache-2.0 |
| androidx.loader:loader:1.0.0 | Apache-2.0 |
| androidx.localbroadcastmanager:localbroadcastmanager:1.0.0 | Apache-2.0 |
| androidx.print:print:1.0.0 | Apache-2.0 |
| androidx.profileinstaller:profileinstaller:1.4.0 | Apache-2.0 |
| androidx.recyclerview:recyclerview:1.1.0 | Apache-2.0 |
| androidx.resourceinspection:resourceinspection-annotation:1.0.1 | Apache-2.0 |
| androidx.savedstate:savedstate-android:1.4.0 | Apache-2.0 |
| androidx.savedstate:savedstate-ktx:1.4.0 | Apache-2.0 |
| androidx.savedstate:savedstate:1.4.0 | Apache-2.0 |
| androidx.startup:startup-runtime:1.1.1 | Apache-2.0 |
| androidx.tracing:tracing:1.0.0 | Apache-2.0 |
| androidx.transition:transition:1.5.0 | Apache-2.0 |
| androidx.vectordrawable:vectordrawable-animated:1.1.0 | Apache-2.0 |
| androidx.vectordrawable:vectordrawable:1.1.0 | Apache-2.0 |
| androidx.versionedparcelable:versionedparcelable:1.1.1 | Apache-2.0 |
| androidx.viewpager2:viewpager2:1.0.0 | Apache-2.0 |
| androidx.viewpager:viewpager:1.0.0 | Apache-2.0 |
| androidx.webkit:webkit:1.14.0 | Apache-2.0 |
| com.fasterxml.jackson.core:jackson-annotations:2.15.3 | Apache-2.0 |
| com.fasterxml.jackson.core:jackson-core:2.15.3 | Apache-2.0 |
| com.fasterxml.jackson.core:jackson-databind:2.15.3 | Apache-2.0 |
| com.fasterxml.jackson.datatype:jackson-datatype-json-org:2.15.3 | Apache-2.0 |
| com.google.android.gms:play-services-base:18.5.0 | Android SDK License (açık kaynak değil) |
| com.google.android.gms:play-services-basement:18.4.0 | Android SDK License (açık kaynak değil) |
| com.google.android.gms:play-services-location:21.3.0 | Android SDK License (açık kaynak değil) |
| com.google.android.gms:play-services-tasks:18.2.0 | Android SDK License (açık kaynak değil) |
| com.google.android.material:material:1.12.0 | Apache-2.0 |
| com.google.errorprone:error_prone_annotations:2.15.0 | Apache-2.0 |
| com.google.guava:listenablefuture:1.0 | Apache-2.0 |
| org.jetbrains.kotlin:kotlin-stdlib:2.2.21 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-coroutines-bom:1.9.0 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.9.0 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-serialization-bom:1.7.3 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.7.3 | Apache-2.0 |
| org.jetbrains.kotlinx:kotlinx-serialization-core:1.7.3 | Apache-2.0 |
| org.jetbrains:annotations:23.0.0 | Apache-2.0 |
| org.jspecify:jspecify:1.0.0 | Apache-2.0 |
