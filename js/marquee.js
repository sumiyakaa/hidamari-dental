/* ============================================================
   marquee.js — マーキー（無限水平スクロール）制御
   HIDAMARI DENTAL
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const tracks = document.querySelectorAll('.gallery-marquee__track');

  tracks.forEach(track => {
    /* トラック内の要素を複製して無限ループを実現 */
    const items = track.innerHTML;
    track.innerHTML = items + items;
  });
});
