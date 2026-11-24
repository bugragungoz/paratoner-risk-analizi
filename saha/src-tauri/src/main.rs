// Masaüstünde geliştirme için; Android'de giriş noktası lib.rs'teki run().
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    saha_lib::run();
}
