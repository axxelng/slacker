// 初始化 Supabase
const SUPABASE_URL = "https://eucs1vrdocxordttpiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 登入 / 註冊功能 =====
async function signUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功，請至信箱確認信件！");
}

async function signIn() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("登入失敗：" + error.message);
  localStorage.setItem("wage", document.getElementById("wage").value);
  showApp();
}

async function signOut() {
  await supabase.auth.signOut();
  document.getElementById("app-section").style.display = "none";
  document.getElementById("auth-section").style.display = "block";
}

// ===== 畫面切換 =====
async function showApp() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  document.getElementById("user-email").innerText = user.email;
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";

  // 復原上次計時狀態
  if (localStorage.getItem("startTime")) {
    document.getElementById("start-btn").disabled = true;
    document.getElementById("end-btn").disabled = false;
  }

  loadSettings();
  fetchStats();
  updateStatus();
}

// ===== 儲存使用者設定（時薪與發薪日） =====
async function saveSettings() {
  const hourly_rate = parseInt(document.getElementById("hourly-rate").value);
  const payday = parseInt(document.getElementById("payday").value);
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    hourly_rate,
    payday
  });
  alert("設定已儲存！");
}

async function loadSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  if (data) {
    document.getElementById("hourly-rate").value = data.hourly_rate || "";
    document.getElementById("payday").value = data.payday || "";
  }
}

// ===== 摸魚開始 / 結束 =====
function startMoyu() {
  const now = Date.now();
  localStorage.setItem("startTime", now.toString());
  document.getElementById("start-btn").disabled = true;
  document.getElementById("end-btn").disabled = false;
  updateStatus();
}

async function endMoyu() {
  const startStr = localStorage.getItem("startTime");
  if (!startStr) return alert("你還沒開始摸魚");

  const start = new Date(parseInt(startStr));
  const end = new Date();
  const durationMin = Math.ceil((end - start) / 60000);

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("moyu_records").insert({
    user_id: user.id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_min: durationMin
  });

  localStorage.removeItem("startTime");
  document.getElementById("start-btn").disabled = false;
  document.getElementById("end-btn").disabled = true;

  fetchStats();
  updateStatus();
}

// ===== 撈統計資料 + 顯示發薪倒數 =====
async function fetchStats() {
  const { data: { user } } = await supabase.auth.getUser();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase.from("moyu_records")
    .select("duration_min")
    .eq("user_id", user.id)
    .gte("start_time", startOfMonth.toISOString());

  const totalMinutes = data.reduce((sum, r) => sum + r.duration_min, 0);
  const wage = parseFloat(document.getElementById("hourly-rate").value || "0");
  const money = ((wage / 60) * totalMinutes).toFixed(2);

  document.getElementById("total-minutes").innerText = totalMinutes;
  document.getElementById("total-money").innerText = money;

  // 發薪倒數
  const payday = parseInt(document.getElementById("payday").value || "0");
  const today = new Date();
  const payDate = new Date(today.getFullYear(), today.getMonth(), payday);
  if (payDate < today) payDate.setMonth(payDate.getMonth() + 1);
  const daysLeft = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));
  document.getElementById("payday-countdown").innerText = daysLeft;
}

// ===== 更新目前狀態（每秒更新）=====
function updateStatus() {
  const wage = parseFloat(document.getElementById("hourly-rate").value || "0");
  const perSecond = wage / 3600;
  let seconds = 0;

  const startStr = localStorage.getItem("startTime");
  if (startStr) {
    const start = parseInt(startStr);
    seconds = Math.floor((Date.now() - start) / 1000);
  }

  const stolen = (seconds * perSecond).toFixed(2);
  const statusText = startStr
    ? `你目前正在偷 ${stolen} 元薪水中 🐟`
    : `你目前還沒開始摸魚喔～`;
  document.getElementById("status").innerText = statusText;
}

// ===== 每秒更新狀態（動態顯示偷錢）=====
setInterval(() => {
  updateStatus();
}, 1000);

// ===== 初始化（登入狀態自動登入）=====
window.onload = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp();
};
