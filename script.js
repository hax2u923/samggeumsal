let priceData = null;

const formatWon = value => `${Math.round(value).toLocaleString("ko-KR")}원`;

async function init() {
  const response = await fetch("data.json");
  priceData = await response.json();
  populateControls();
  updateDashboard(priceData.years.length - 1);
}

function populateControls() {
  const yearSelect = document.getElementById("yearSelect");
  const regionSelect = document.getElementById("regionSelect");

  priceData.years.forEach((year, index) => {
    const yearOption = document.createElement("option");
    yearOption.value = index;
    yearOption.textContent = `${year}년`;
    yearSelect.appendChild(yearOption);
  });
  yearSelect.value = String(priceData.years.length - 1);

  priceData.regions.forEach(region => {
    const regionOption = document.createElement("option");
    regionOption.value = region.region;
    regionOption.textContent = region.region;
    regionSelect.appendChild(regionOption);
  });

  yearSelect.addEventListener("change", event => updateDashboard(Number(event.target.value)));
  regionSelect.addEventListener("change", event => updateTrend(event.target.value));
  regionSelect.value = "서울";
  updateTrend("서울");
}

function updateDashboard(yearIndex) {
  const year = priceData.years[yearIndex];
  const rows = priceData.regions.map(region => ({
    region: region.region,
    value: region.values[yearIndex]
  })).sort((a, b) => b.value - a.value);

  const average = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  const gap = highest.value - lowest.value;

  document.getElementById("latestAverage").textContent = formatWon(average);
  document.getElementById("highestRegion").textContent = highest.region;
  document.getElementById("highestPrice").textContent = formatWon(highest.value);
  document.getElementById("lowestRegion").textContent = lowest.region;
  document.getElementById("lowestPrice").textContent = formatWon(lowest.value);
  document.getElementById("priceGap").textContent = `지역간 격차: ${formatWon(gap)}`;

  const latestFirst = rows.map(row => row.region);
  const maxValues = rows.map(row => row.value);
  document.getElementById("barChart").setAttribute(
    "aria-label",
    `${year}년 지역별 삼겹살 외식가격 막대그래프`
  );

  const firstYearIndex = 0;
  const firstYearAverage = priceData.regions.reduce((sum, region) => sum + region.values[firstYearIndex], 0) / priceData.regions.length;
  const latestAverage = priceData.regions.reduce((sum, region) => sum + region.values[yearIndex], 0) / priceData.regions.length;
  const comparedAverage = yearIndex === firstYearIndex
    ? latestAverage
    : priceData.regions.reduce((sum, region) => sum + region.values[yearIndex - 1], 0) / priceData.regions.length;
  const yearlyChange = ((latestAverage - comparedAverage) / comparedAverage) * 100;
  const longTermChange = ((latestAverage - firstYearAverage) / firstYearAverage) * 100;

  document.getElementById("latestChange").textContent =
    yearIndex === firstYearIndex
      ? `${year}년 기준`
      : `전년 대비 ${yearlyChange >= 0 ? "+" : ""}${yearlyChange.toFixed(1)}%`;
  document.getElementById("longTermChange").textContent =
    `${longTermChange >= 0 ? "+" : ""}${longTermChange.toFixed(1)}%`;

  renderBars(rows, average);
  updateAnalysis(rows, average, year);
  updateTrend(document.getElementById("regionSelect").value);
}

function renderBars(rows, average) {
  const chart = document.getElementById("barChart");
  chart.innerHTML = "";

  const maxValue = Math.max(...rows.map(row => row.value));
  const chartHeight = 390;

  const axis = document.createElement("div");
  axis.className = "axis-label";
  axis.textContent = "원";
  axis.style.gridRow = "1";
  chart.appendChild(axis);

  rows.forEach((row, index) => {
    const column = document.createElement("div");
    column.className = "bar-column";
    column.style.gridColumn = String(index + 2);

    const bar = document.createElement("div");
    bar.className = "bar";
    if (row.value === maxValue) bar.classList.add("highest");
    else if (row.value > average) bar.classList.add("above-average");

    const height = Math.round((row.value / maxValue) * (chartHeight - 22));
    bar.style.height = `${height}px`;

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = row.value.toLocaleString("ko-KR");
    bar.appendChild(value);
    column.appendChild(bar);
    chart.appendChild(column);

    const name = document.createElement("div");
    name.className = "bar-name";
    name.style.gridColumn = String(index + 2);
    name.textContent = row.region.replace("(광주)", "").replace("(전남)", "");
    chart.appendChild(name);
  });
}

function updateAnalysis(rows, average, year) {
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  const aboveAverage = rows.filter(row => row.value > average).length;
  document.getElementById("analysisMessage").textContent =
    `${year}년 기준 ${highest.region}이(가) ${formatWon(highest.value)}로 최고가이며, ` +
    `${lowest.region}은(는) ${formatWon(lowest.value)}로 최저가입니다. ` +
    `${rows.length}개 지역 중 ${aboveAverage}개 지역이 전국 평균을 넘었습니다.`;
}

function updateTrend(regionName) {
  const region = priceData.regions.find(item => item.region === regionName);
  if (!region) return;

  const latestIndex = region.values.length - 1;
  const latest = region.values[latestIndex];
  const first = region.values[0];
  const change = ((latest - first) / first) * 100;

  document.getElementById("trendLatest").textContent = formatWon(latest);
  document.getElementById("trendChange").textContent =
    `10년간 ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;

  renderTrendChart(region);
}

function renderTrendChart(region) {
  const chart = document.getElementById("trendChart");
  const width = 320;
  const height = 150;
  const padding = { top: 12, right: 8, bottom: 20, left: 8 };
  const values = region.values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((max - value) / range) * (height - padding.top - padding.bottom);
    return [x, y];
  });

  const polyline = points.map(point => point.join(",")).join(" ");
  const area = `${padding.left},${height - padding.bottom} ${polyline} ${width - padding.right},${height - padding.bottom}`;

  chart.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#ddd8cd"/>
      <polygon points="${area}" fill="rgba(229,155,69,.15)"/>
      <polyline points="${polyline}" fill="none" stroke="#dc5547" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((point, index) => `
        <circle cx="${point[0]}" cy="${point[1]}" r="${index === points.length - 1 ? 5 : 3}"
          fill="${index === points.length - 1 ? "#dc5547" : "#f4f1ea"}"
          stroke="#dc5547" stroke-width="2"/>
      `).join("")}
      ${priceData.years.map((year, index) => {
        if (index % 2 !== 0 && index !== priceData.years.length - 1) return "";
        const x = padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
        return `<text x="${x}" y="${height - 4}" text-anchor="middle" font-size="8" fill="#77776f">${year.slice(2)}</text>`;
      }).join("")}
    </svg>
  `;
}

init().catch(error => {
  document.getElementById("analysisMessage").textContent = "데이터를 불러오지 못했습니다.";
  console.error(error);
});
