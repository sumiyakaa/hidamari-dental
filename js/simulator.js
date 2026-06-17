/* ============================================================
   simulator.js — 料金シミュレーター（口腔内マップ + 計算 + PDF出力）
   HIDAMARI DENTAL
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('simulatorApp');
  if (!app) return;

  /* -------------------------------------------------------
     料金データ
     ------------------------------------------------------- */
  const PRICES = {
    cosmetic: {
      'emax-inlay':  { name: 'e.max セラミックインレー', price: 44000 },
      'emax-crown':  { name: 'e.max セラミッククラウン', price: 66000 },
      'zirconia':    { name: 'ジルコニアセラミック',      price: 88000 },
      'veneer':      { name: 'ラミネートベニア',          price: 88000 }
    },
    ortho: {
      'invisalign-full': { name: 'マウスピース矯正（全体）', min: 770000, max: 990000 },
      'invisalign-lite': { name: 'マウスピース矯正（軽度）', min: 440000, max: 550000 },
      'wire':            { name: 'ワイヤー矯正（表側）',     min: 660000, max: 880000 },
      'child':           { name: '小児矯正Ⅰ期',             min: 330000, max: 440000 },
      'partial':         { name: '部分矯正',                 min: 220000, max: 440000 }
    },
    implant: {
      base: 385000, // 中央値
      gbr: 82500,
      sinuslift: 55000
    },
    whitening: {
      'office': { name: 'オフィスホワイトニング', price: 22000 },
      'home':   { name: 'ホームホワイトニング',   price: 27500 },
      'dual':   { name: 'デュアルホワイトニング', price: 44000 }
    }
  };

  const CATEGORY_NAMES = {
    cosmetic: '審美歯科',
    ortho: '矯正歯科',
    implant: 'インプラント',
    whitening: 'ホワイトニング'
  };

  /* -------------------------------------------------------
     State
     ------------------------------------------------------- */
  let currentStep = 1;
  let selectedCategory = null;
  let selectedTeeth = new Set();
  let totalSteps = 4;

  /* -------------------------------------------------------
     DOM Elements
     ------------------------------------------------------- */
  const steps = app.querySelectorAll('.simulator__step');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnPdf = document.getElementById('btnPdf');
  const btnRetry = document.getElementById('btnRetry');
  const toothMap = document.getElementById('toothMap');
  const orthoMenu = document.getElementById('orthoMenu');
  const whiteningMenu = document.getElementById('whiteningMenu');
  const cosmeticMaterial = document.getElementById('cosmeticMaterial');
  const implantOptions = document.getElementById('implantOptions');
  const toothCountEl = document.getElementById('toothCount');
  const implantToothCountEl = document.getElementById('implantToothCount');
  const tooltip = document.getElementById('toothTooltip');

  /* -------------------------------------------------------
     料金テーブル タブ切替
     ------------------------------------------------------- */
  const priceTabs = document.querySelectorAll('.price-tabs__tab');
  const pricePanels = document.querySelectorAll('.price-tabs__panel');

  priceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      priceTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      pricePanels.forEach(p => {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });

  /* -------------------------------------------------------
     ステップ表示更新
     ------------------------------------------------------- */
  function showStep(n) {
    steps.forEach(s => s.classList.remove('active'));
    const target = app.querySelector(`[data-step="${n}"]`);
    if (target) target.classList.add('active');

    btnPrev.style.display = n > 1 ? 'inline-flex' : 'none';

    if (n === totalSteps) {
      btnNext.style.display = 'none';
      calculateResult();
    } else {
      btnNext.style.display = 'inline-flex';
    }

    updateNextButtonState();
  }

  /* -------------------------------------------------------
     Next ボタン有効/無効
     ------------------------------------------------------- */
  function updateNextButtonState() {
    let valid = false;
    if (currentStep === 1) {
      valid = selectedCategory !== null;
    } else if (currentStep === 2) {
      if (selectedCategory === 'ortho') {
        valid = !!app.querySelector('input[name="orthoType"]:checked');
      } else if (selectedCategory === 'whitening') {
        valid = !!app.querySelector('input[name="whiteningType"]:checked');
      } else {
        valid = selectedTeeth.size > 0;
      }
    } else if (currentStep === 3) {
      if (selectedCategory === 'cosmetic') {
        valid = !!app.querySelector('input[name="material"]:checked');
      } else if (selectedCategory === 'implant') {
        valid = true; // options are optional
      } else {
        valid = true;
      }
    }
    btnNext.disabled = !valid;
  }

  /* -------------------------------------------------------
     カテゴリ選択
     ------------------------------------------------------- */
  app.querySelectorAll('input[name="category"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedCategory = radio.value;
      selectedTeeth.clear();
      updateToothCount();
      updateNextButtonState();

      /* ステップ数を調整 */
      if (selectedCategory === 'ortho' || selectedCategory === 'whitening') {
        totalSteps = 3; // STEP1 → STEP2(menu) → RESULT
      } else {
        totalSteps = 4; // STEP1 → STEP2(map) → STEP3(material/options) → RESULT
      }
    });
  });

  /* -------------------------------------------------------
     STEP2 表示切替
     ------------------------------------------------------- */
  function setupStep2() {
    const step2Title = document.getElementById('step2Title');
    toothMap.style.display = 'none';
    orthoMenu.style.display = 'none';
    whiteningMenu.style.display = 'none';

    if (selectedCategory === 'ortho') {
      orthoMenu.style.display = 'block';
      step2Title.textContent = '矯正メニューを選択';
    } else if (selectedCategory === 'whitening') {
      whiteningMenu.style.display = 'block';
      step2Title.textContent = 'ホワイトニングメニューを選択';
    } else {
      toothMap.style.display = 'block';
      step2Title.textContent = selectedCategory === 'implant'
        ? '欠損歯をクリックで選択'
        : '施術対象の歯をクリックで選択';
    }
    // Clear previous tooth selections visually
    document.querySelectorAll('.tooth-map__tooth.selected').forEach(t => t.classList.remove('selected'));
    selectedTeeth.clear();
    updateToothCount();
  }

  /* -------------------------------------------------------
     STEP3 表示切替
     ------------------------------------------------------- */
  function setupStep3() {
    const step3Title = document.getElementById('step3Title');
    cosmeticMaterial.style.display = 'none';
    implantOptions.style.display = 'none';

    if (selectedCategory === 'cosmetic') {
      cosmeticMaterial.style.display = 'block';
      step3Title.textContent = '素材を選択';
    } else if (selectedCategory === 'implant') {
      implantOptions.style.display = 'block';
      implantToothCountEl.textContent = selectedTeeth.size;
      step3Title.textContent = 'オプションを選択';
    }
  }

  /* -------------------------------------------------------
     歯選択
     ------------------------------------------------------- */
  document.querySelectorAll('.tooth-map__tooth').forEach(tooth => {
    tooth.addEventListener('click', () => {
      const id = tooth.dataset.tooth;
      if (selectedTeeth.has(id)) {
        selectedTeeth.delete(id);
        tooth.classList.remove('selected');
      } else {
        selectedTeeth.add(id);
        tooth.classList.add('selected');
      }
      updateToothCount();
      updateNextButtonState();
    });

    /* ツールチップ */
    tooth.addEventListener('mouseenter', (e) => {
      tooltip.textContent = tooth.dataset.name;
      tooltip.classList.add('show');
      positionTooltip(e);
    });

    tooth.addEventListener('mousemove', positionTooltip);

    tooth.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  });

  function positionTooltip(e) {
    const mapRect = toothMap.getBoundingClientRect();
    tooltip.style.left = (e.clientX - mapRect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - mapRect.top - 32) + 'px';
  }

  function updateToothCount() {
    toothCountEl.textContent = selectedTeeth.size;
  }

  /* -------------------------------------------------------
     矯正・ホワイトニング ラジオ変更検知
     ------------------------------------------------------- */
  app.querySelectorAll('input[name="orthoType"], input[name="whiteningType"], input[name="material"]').forEach(r => {
    r.addEventListener('change', updateNextButtonState);
  });

  /* -------------------------------------------------------
     歯ID → 日本語名
     ------------------------------------------------------- */
  function toothIdToName(id) {
    const el = document.querySelector(`[data-tooth="${id}"]`);
    return el ? el.dataset.name : id;
  }

  /* -------------------------------------------------------
     計算
     ------------------------------------------------------- */
  function calculateResult() {
    const resultCategory = document.getElementById('resultCategory');
    const resultDetail = document.getElementById('resultDetail');
    const resultTarget = document.getElementById('resultTarget');
    const resultQuantity = document.getElementById('resultQuantity');
    const resultTotal = document.getElementById('resultTotal');

    resultCategory.textContent = CATEGORY_NAMES[selectedCategory] || '—';
    let total = 0;
    let detail = '';
    let target = '';
    let quantity = '';

    if (selectedCategory === 'cosmetic') {
      const material = app.querySelector('input[name="material"]:checked')?.value;
      if (material && PRICES.cosmetic[material]) {
        const mat = PRICES.cosmetic[material];
        detail = mat.name;
        target = [...selectedTeeth].map(toothIdToName).join('、');
        quantity = selectedTeeth.size + '本';
        total = mat.price * selectedTeeth.size;
      }
    } else if (selectedCategory === 'ortho') {
      const type = app.querySelector('input[name="orthoType"]:checked')?.value;
      if (type && PRICES.ortho[type]) {
        const ortho = PRICES.ortho[type];
        detail = ortho.name;
        target = '—';
        quantity = '1式';
        total = Math.round((ortho.min + ortho.max) / 2);
      }
    } else if (selectedCategory === 'implant') {
      const count = selectedTeeth.size;
      const gbr = app.querySelector('input[name="gbr"]')?.checked;
      const sinuslift = app.querySelector('input[name="sinuslift"]')?.checked;
      detail = 'インプラント';
      target = [...selectedTeeth].map(toothIdToName).join('、');
      quantity = count + '本';
      total = PRICES.implant.base * count;
      if (gbr) {
        total += PRICES.implant.gbr * count;
        detail += ' + 骨造成（GBR）';
      }
      if (sinuslift) {
        total += PRICES.implant.sinuslift * count;
        detail += ' + ソケットリフト';
      }
    } else if (selectedCategory === 'whitening') {
      const type = app.querySelector('input[name="whiteningType"]:checked')?.value;
      if (type && PRICES.whitening[type]) {
        const wh = PRICES.whitening[type];
        detail = wh.name;
        target = '—';
        quantity = '1回';
        total = wh.price;
      }
    }

    resultDetail.textContent = detail || '—';
    resultTarget.textContent = target || '—';
    resultQuantity.textContent = quantity || '—';
    resultTotal.textContent = '¥' + total.toLocaleString();
  }

  /* -------------------------------------------------------
     ナビゲーション
     ------------------------------------------------------- */
  btnNext.addEventListener('click', () => {
    if (currentStep === 1) {
      setupStep2();
    }
    if (currentStep === 2 && (selectedCategory === 'cosmetic' || selectedCategory === 'implant')) {
      setupStep3();
    }

    /* 矯正・ホワイトニングはSTEP2 → RESULT (step3をスキップ) */
    if (currentStep === 2 && (selectedCategory === 'ortho' || selectedCategory === 'whitening')) {
      currentStep = totalSteps;
    } else {
      currentStep++;
    }

    showStep(currentStep);
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep === totalSteps && (selectedCategory === 'ortho' || selectedCategory === 'whitening')) {
      currentStep = 2;
    } else {
      currentStep--;
    }
    if (currentStep < 1) currentStep = 1;
    showStep(currentStep);
  });

  btnRetry.addEventListener('click', () => {
    currentStep = 1;
    selectedCategory = null;
    selectedTeeth.clear();
    totalSteps = 4;
    document.querySelectorAll('.tooth-map__tooth.selected').forEach(t => t.classList.remove('selected'));
    updateToothCount();
    app.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    app.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    showStep(1);
    btnNext.style.display = 'inline-flex';
  });

  /* -------------------------------------------------------
     PDF出力（jsPDF）
     ------------------------------------------------------- */
  btnPdf.addEventListener('click', () => {
    if (typeof window.jspdf === 'undefined') {
      alert('PDF機能の読み込み中です。しばらくしてから再度お試しください。');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    /* 日本語フォント（Zen Kaku Gothic New サブセット）を埋め込み。これで日本語が文字化けしない */
    if (window.HIDAMARI_JP_FONT_B64) {
      doc.addFileToVFS('ZenKakuGothicNew.ttf', window.HIDAMARI_JP_FONT_B64);
      doc.addFont('ZenKakuGothicNew.ttf', 'ZenKakuJP', 'normal');
      doc.setFont('ZenKakuJP');
    }
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    /* ヘッダーバー */
    doc.setFillColor(27, 27, 27); // --dark（チャコール）
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(245, 243, 242);
    doc.setFontSize(16);
    doc.text('HIDAMARI DENTAL CLINIC', margin, 12);
    doc.setFontSize(8);
    doc.text('DENTAL CLINIC', margin, 18);
    doc.setFontSize(8);
    doc.text('TEL: 0120-XXX-XXX', pageW - margin, 12, { align: 'right' });
    y = 40;

    /* タイトル */
    doc.setTextColor(44, 42, 37);
    doc.setFontSize(20);
    doc.text('Estimate / お見積書', pageW / 2, y, { align: 'center' });
    y += 12;

    /* 日付 */
    doc.setFontSize(10);
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
    doc.text(`Date: ${dateStr}`, pageW - margin, y, { align: 'right' });
    y += 12;

    /* 区切り線 */
    doc.setDrawColor(176, 176, 174); // --grey
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 10;

    /* 明細 */
    const fields = [
      ['Category', document.getElementById('resultCategory').textContent],
      ['Detail', document.getElementById('resultDetail').textContent],
      ['Target', document.getElementById('resultTarget').textContent],
      ['Quantity', document.getElementById('resultQuantity').textContent]
    ];

    doc.setFontSize(10);
    fields.forEach(([label, value]) => {
      doc.setTextColor(138, 132, 119); // --text-tertiary
      doc.text(label, margin, y);
      doc.setTextColor(44, 42, 37);
      doc.text(value, margin + 40, y);
      y += 8;
    });

    y += 6;
    doc.setDrawColor(176, 176, 174);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    /* 合計 */
    doc.setFontSize(12);
    doc.setTextColor(138, 132, 119);
    doc.text('Total (tax incl.)', margin, y);
    doc.setFontSize(22);
    doc.setTextColor(27, 27, 27);
    const totalText = document.getElementById('resultTotal').textContent;
    doc.text(totalText, pageW - margin, y, { align: 'right' });
    y += 16;

    doc.setDrawColor(176, 176, 174);
    doc.line(margin, y, pageW - margin, y);
    y += 14;

    /* 注意書き */
    doc.setFontSize(8);
    doc.setTextColor(138, 132, 119);
    const notes = [
      '* This estimate is an approximation. Exact costs will be determined after examination.',
      '* Prices include tax.',
      '* This estimate is valid for 30 days from the date of issue.'
    ];
    notes.forEach(note => {
      doc.text(note, margin, y);
      y += 5;
    });

    /* フッター */
    const footerY = 280;
    doc.setDrawColor(232, 223, 210);
    doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setFontSize(8);
    doc.setTextColor(138, 132, 119);
    doc.text('HIDAMARI DENTAL CLINIC', margin, footerY);
    doc.text('TEL: 0120-XXX-XXX', margin, footerY + 5);
    doc.text('Generated by HIDAMARI DENTAL Price Simulator', pageW - margin, footerY, { align: 'right' });

    doc.save('hidamari-dental-estimate.pdf');
  });

  /* -------------------------------------------------------
     初期化
     ------------------------------------------------------- */
  showStep(1);
});
