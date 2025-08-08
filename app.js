import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://eucslvrdocoxrodttipy.supabase.co"; // ← 確認你的 Supabase 網址
const supabaseKey = "YOUR_ANON_KEY"; // ← 用你的 anon key 替換

const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  // 📌 修正登入函式
  window.signIn = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("登入失敗：" + error.message);
    } else {
      alert("登入成功！");
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("app-section").style.display = "block";
      document.getElementById("user-email").textContent = email;
    }
  };

  // 📌 註冊函式
  window.signUp = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert("註冊失敗：" + error.message);
    } else {
      alert("註冊成功，請至信箱點擊確認信");
    }
  };

  // 📌 登出
  window.signOut = async () => {
    await supabase.auth.signOut();
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  };
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

// 儲存設定
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

// 摸魚功能
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
