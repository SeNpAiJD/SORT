const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxC9HBT8PMxDBeKj9NV1bHAi1DpPWetrKj5UOqLqUeqIgDTxw3r8Rh1N8DV8v7jt7mt/exec";

let allRecords = [];

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

async function init() {
  const resultsGrid = document.getElementById('resultsGrid');
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();
    console.log("Data received from Apps Script:", data);
    allRecords = normalizeRecords(data);

    if (allRecords.length === 0) {
      resultsGrid.innerHTML = `<div class="empty-state">The script sent no rows. Check that the sheet has data and the Apps Script returns it.</div>`;
      document.getElementById('resultCount').textContent = "";
      return;
    }

    populateDropdowns();
    applyFilters(); 
  } catch (err) {
    resultsGrid.innerHTML = `<div class="empty-state">Error loading data. Check console.</div>`;
    document.getElementById('resultCount').textContent = "";
    console.error(err);
  }
}

function normalizeRecords(data) {
  let rows = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    rows = data.records || data.data || data.rows || data.values ||
           Object.values(data).find(Array.isArray) || [];
  }
  if (!rows.length) return [];

  if (Array.isArray(rows[0])) {
    const headers = rows[0].map(h => clean(h));
    rows = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  }

  const pick = (obj, words) => {
    const key = Object.keys(obj).find(k => words.some(w => k.toLowerCase().includes(w)));
    return key === undefined ? "" : obj[key];
  };

  return rows
    .filter(r => r && typeof r === 'object')
    .map(r => ({
      name: pick(r, ['name']),
      age: pick(r, ['age']),
      profession: pick(r, ['profession', 'occupation', 'job', 'work', 'course']),
      gender: pick(r, ['gender', 'sex'])
    }))
    .filter(r => clean(r.name) || clean(r.age) || clean(r.profession) || clean(r.gender));
}

function populateDropdowns() {
  const professions = new Set();
  const genders = new Set();

  allRecords.forEach(record => {
    if (clean(record.profession)) professions.add(clean(record.profession));
    if (clean(record.gender)) genders.add(clean(record.gender));
  });

  const profSelect = document.getElementById('professionFilter');
  [...professions].sort().forEach(prof => {
    profSelect.add(new Option(prof, prof));
  });

  const genderSelect = document.getElementById('genderFilter');
  [...genders].sort().forEach(gender => {
    genderSelect.add(new Option(gender, gender));
  });
}

function getAgeBracket(age) {
  const a = parseInt(age, 10);
  if (isNaN(a)) return null;
  if (a >= 18 && a <= 20) return "18-20";
  if (a >= 21 && a <= 25) return "21-25";
  if (a >= 26 && a <= 30) return "26-30";
  if (a >= 31 && a <= 35) return "31-35";
  if (a >= 36 && a <= 40) return "36-40";
  if (a >= 41 && a <= 45) return "41-45";
  if (a >= 46 && a <= 50) return "46-50";
  if (a >= 51 && a <= 55) return "51-55";
  if (a >= 56 && a <= 60) return "56-60";
  if (a >= 61) return "61+";
  return null;
}

function applyFilters() {
  const ageVal = document.getElementById('ageFilter').value;
  const profVal = document.getElementById('professionFilter').value;
  const genderVal = document.getElementById('genderFilter').value;

  const filtered = allRecords.filter(record => {
    let ageMatch = true;
    if (ageVal !== "all") {
      ageMatch = getAgeBracket(record.age) === ageVal;
    }

    let profMatch = true;
    if (profVal !== "all") {
      profMatch = clean(record.profession) === profVal;
    }

    let genderMatch = true;
    if (genderVal !== "all") {
      genderMatch = clean(record.gender) === genderVal;
    }

    return ageMatch && profMatch && genderMatch;
  });

  const sorted = sortRecords(filtered, document.getElementById('sortBy').value);
  renderGrid(sorted);
}

function sortRecords(records, sortValue) {
  const [field, direction] = sortValue.split('-');
  const dir = direction === 'desc' ? -1 : 1;

  return [...records].sort((a, b) => {
    let result;

    if (field === 'age') {
      const ageA = parseInt(a.age, 10);
      const ageB = parseInt(b.age, 10);
      if (isNaN(ageA) && isNaN(ageB)) result = 0;
      else if (isNaN(ageA)) return 1;
      else if (isNaN(ageB)) return -1;
      else result = (ageA - ageB) * dir;
    } else {
      const textA = clean(a[field]);
      const textB = clean(b[field]);
      if (!textA && textB) return 1;
      if (textA && !textB) return -1;
      result = textA.localeCompare(textB, undefined, { sensitivity: 'base' }) * dir;
    }

    if (result === 0 && field !== 'name') {
      result = clean(a.name).localeCompare(clean(b.name), undefined, { sensitivity: 'base' });
    }
    return result;
  });
}

function resetFilters() {
  document.getElementById('ageFilter').value = 'all';
  document.getElementById('professionFilter').value = 'all';
  document.getElementById('genderFilter').value = 'all';
  document.getElementById('sortBy').value = 'name-asc';
  applyFilters();
}

function renderGrid(records) {
  const resultsGrid = document.getElementById('resultsGrid');
  const count = document.getElementById('resultCount');

  count.textContent = `Showing ${records.length} of ${allRecords.length} records`;

  if (records.length === 0) {
    resultsGrid.innerHTML = `<div class="empty-state">No records match the selected filters.</div>`;
    return;
  }

  resultsGrid.innerHTML = records.map(record => `
    <div class="card">
      <h3>${escapeHtml(record.name)}</h3>
      <div class="detail"><strong>Age:</strong> ${escapeHtml(record.age)}</div>
      <div class="detail"><strong>Profession:</strong> ${escapeHtml(record.profession)}</div>
      <div class="detail"><strong>Gender:</strong> ${escapeHtml(record.gender)}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

init();