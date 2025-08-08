import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ 填入你的 Supabase 設定
const supabaseUrl = "https://eucslvrdocoxrodttipy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ 測試連線
supabase.auth.getSession().then(({ data, error }) => {
  console.log("✅ Supabase 已連接：", data);
  if (error) console.error("❌ 發生錯誤：", error);
});

// ✅ 註冊
window.signUp = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功，請至信箱點擊確認信件！");
};

// ✅ 登入
window.signIn = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("登入失敗：" + error.message);

  alert("登入成功！");
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = email;

  await loadSettings();
  await fetchStats();
  updateStatus();
};

// ✅ 登出
window.signOut = async () => {
  await supabase.auth.signOut();
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
};

// ✅ 儲存設定（時薪、發薪日）
window.saveSettings = async () => {
  const hourly_rate = parseInt(document.getElementById("hourly-rate").value);
  const payday = parseInt(document.getElementById("payday").value);
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    hourly_rate,
    payday
  });
  alert("設定已儲存！");
};

// ✅ 載入設定
async function loadSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  if (data) {
    document.getElementById("hourly-rate").value = data.hourly_rate || "";
    document.getElementById("payday").value = data.payday || "";
  }
}

// ✅ 開始摸魚
window.startMoyu = () => {
  const now = Date.now();
  localStorage.setItem("startTime", now.toString());
  document.getElementById("start-btn").disabled = true;
  document.getElementById("end-btn").disabled = false;
  updateStatus();
};

// ✅ 結束摸魚
window.endMoyu = async () => {
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

  await fetchStats();
  updateStatus();
};

// ✅ 撈統計資料
async function fetchStats() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("moyu_records")
    .select("*")
    .eq("user_id", user.id);

  if (error) return console.error("抓統計錯誤", error);

  const totalMin = data.reduce((sum, row) => sum + row.duration_min, 0);
  const hourlyRate = parseInt(document.getElementById("hourly-rate").value) || 0;
  const totalMoney = (totalMin / 60) * hourlyRate;

  document.getElementById("total-minutes").textContent = totalMin;
  document.getElementById("total-money").textContent = Math.floor(totalMoney);

  const payday = parseInt(document.getElementById("payday").value);
  const today = new Date();
  const currentDay = today.getDate();
  let countdown = payday - currentDay;
  if (countdown < 0) countdown += 30;

  document.getElementById("payday-countdown").textContent = countdown;
}

// ✅ 更新狀態顯示
function updateStatus() {
  if (localStorage.getItem("startTime")) {
    document.getElementById("status").textContent = "🐟 正在摸魚中...";
  } else {
    document.getElementById("status").textContent = "你目前還沒開始摸魚喔～";
  }
}
