// 初始化 Supabase - 使用 ESM 模組引入
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://eucs1vrdocxordttpiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
// 將主要函式綁定到全域，讓 HTML onclick 可以使用
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.startMoyu = startMoyu;
window.endMoyu = endMoyu;
window.saveSettings = saveSettings;

// 測試是否連上 Supabase（打開 F12 看 Console 有沒有印出結果）
supabase.auth.getSession().then(({ data, error }) => {
  console.log("✅ Supabase 已連接：", data)
  if (error) console.error("❌ 發生錯誤：", error)
})
