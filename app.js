import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ 填入你的 Supabase 設定
const supabaseUrl = "https://eucslvrdocoxrodttipy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ 等待 DOM 載入完再掛事件
document.addEventListener("DOMContentLoaded", () => {
  // 📌 登入
  window.signIn = async () => {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (!emailInput || !passwordInput) return alert("找不到輸入欄位");

    const email = emailInput.value;
    const password = passwordInput.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("登入失敗：" + error.message);
    } else {
      alert("登入成功！");
      showApp();
    }
  };

  // 📌 註冊
  window.signUp = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert("註冊失敗：" + error.message);
    } else {
      alert("註冊成功，請去信箱確認！");
    }
  };

  // 📌 登出
  window.signOut = async () => {
    await supabase.auth.signOut();
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  };

  // 📌 測試連線
  supabase.auth.getSession().then(({ data, error }) => {
    console.log("✅ Supabase 已連接：", data);
    if (error) console.error("❌ 發生錯誤：", error);
  });
});

async function showApp() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  document.getElementById("user-email").innerText = user.email;
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";

  if (localStorage.getItem("startTime")) {
    document.getElementById("start-btn").disabled = true;
    document.getElementById("end-btn").disabled = false;
  }

  loadSettings();
  fetchStats();
  updateStatus();
}

// 其他功能照原本寫的放在下面
window.startMoyu = function () {
  const now = Date.now();
  localStorage.setItem("startTime", now.toString());
  document.getElementById("start-btn").disabled = true;
  document.getElementById("end-btn").disabled = false;
  updateStatus();
};

window.endMoyu = async function () {
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
};

window.saveSettings = async function () {
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

async function loadSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  if (data) {
    document.getElementById("hourly-rate").value = data.hourly_rate || "";
    document.getElementById("payday").value = data.payday || "";
  }
}

async function fetchStats() {
  // 尚未實作：撈取統計資料
}

function updateStatus() {
  const startTime = localStorage.getItem("startTime");
  const status = document.getElementById("status");
  if (startTime) {
    status.innerText = "你正在努力地摸魚中～";
  } else {
    status.innerText = "你目前還沒開始摸魚喔～";
  }
}
