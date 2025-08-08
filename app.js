// ✅ Supabase 初始化
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://eucslvrdocoxrodttipy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = createClient(supabaseUrl, supabaseKey);

let currentUserType = null; // "auth" or "guest"
let currentGuestUser = null; // guest user 資料

// ✅ Email 註冊
window.signUp = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功，請至信箱點擊確認信件！");
};

// ✅ Email 登入
window.signIn = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("登入失敗：" + error.message);

  currentUserType = "auth";
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = email;
  await checkSettings();
};

// ✅ 登出
window.signOut = async () => {
  await supabase.auth.signOut();
  currentUserType = null;
  currentGuestUser = null;
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
};

// ✅ 訪客註冊
window.guestSignUp = async () => {
  const nickname = document.getElementById("guest-nickname").value;
  const password = document.getElementById("guest-password").value;
  if (!nickname || !password) return alert("請輸入暱稱與密碼");

  const { data: existing } = await supabase.from("guest_users").select("*").eq("nickname", nickname).single();
  if (existing) return alert("暱稱已被使用，請換一個");

  const { error } = await supabase.from("guest_users").insert([{ nickname, password }]);
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功！請使用暱稱登入。");
};

// ✅ 訪客登入
window.guestSignIn = async () => {
  const nickname = document.getElementById("guest-nickname").value;
  const password = document.getElementById("guest-password").value;
  if (!nickname || !password) return alert("請輸入暱稱與密碼");

  const { data, error } = await supabase.from("guest_users").select("*").eq("nickname", nickname).eq("password", password).single();
  if (error || !data) return alert("登入失敗：暱稱或密碼錯誤");

  currentUserType = "guest";
  currentGuestUser = data;

  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = data.nickname;

  await checkSettings();
};

// ✅ 設定檢查
async function checkSettings() {
  if (currentUserType === "guest") {
    const { data } = await supabase.from("guest_settings").select("*").eq("user_id", currentGuestUser.id).single();
    handleSettings(data);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
    handleSettings(data);
  }
}

function handleSettings(data) {
  if (!data || !data.hourly_rate || !data.payday) {
    document.getElementById("settings-form").style.display = "block";
    document.getElementById("edit-settings-btn").style.display = "none";
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("end-btn").style.display = "none";
  } else {
    document.getElementById("hourly-rate").value = data.hourly_rate;
    document.getElementById("payday").value = data.payday;
    document.getElementById("settings-form").style.display = "none";
    document.getElementById("edit-settings-btn").style.display = "inline-block";
    document.getElementById("start-btn").style.display = "inline-block";
    document.getElementById("end-btn").style.display = "inline-block";
    fetchStats();
    updateStatus();
  }
}

// ✅ 儲存設定
window.saveSettings = async () => {
  const hourly_rate = parseInt(document.getElementById("hourly-rate").value);
  const payday = parseInt(document.getElementById("payday").value);

  if (currentUserType === "guest") {
    await supabase.from("guest_settings").upsert({
      user_id: currentGuestUser.id,
      hourly_rate,
      payday
    });
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      hourly_rate,
      payday
    });
  }

  alert("設定已儲存！");
  document.getElementById("settings-form").style.display = "none";
  document.getElementById("edit-settings-btn").style.display = "inline-block";
  document.getElementById("start-btn").style.display = "inline-block";
  document.getElementById("end-btn").style.display = "inline-block";

  fetchStats();
  updateStatus();
};

// ✅ 開始摸魚
window.startMoyu = () => {
  localStorage.setItem("startTime", Date.now().toString());
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

  if (currentUserType === "guest") {
    await supabase.from("guest_moyu_records").insert({
      user_id: currentGuestUser.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_min: durationMin
    });
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("moyu_records").insert({
      user_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_min: durationMin
    });
  }

  localStorage.removeItem("startTime");
  document.getElementById("start-btn").disabled = false;
  document.getElementById("end-btn").disabled = true;
  fetchStats();
  updateStatus();
};

// ✅ 撈統計資料
async function fetchStats() {
  let userId, tableName;
  if (currentUserType === "guest") {
    userId = currentGuestUser.id;
    tableName = "guest_moyu_records";
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user.id;
    tableName = "moyu_records";
  }

  const { data, error } = await supabase.from(tableName).select("*").eq("user_id", userId);
  if (error) return console.error("統計撈取錯誤：", error);

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

function updateStatus() {
  if (localStorage.getItem("startTime")) {
    document.getElementById("status").textContent = "🐟 正在摸魚中...";
  } else {
    document.getElementById("status").textContent = "你目前還沒開始摸魚喔～";
  }
}
// ✅ Supabase 初始化
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://eucslvrdocoxrodttipy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NsdnJkb2NveHJvZHR0aXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzU3NDAsImV4cCI6MjA3MDIxMTc0MH0.hPPmz92thDkeO-tr58raZrngJrnAdW_iIS79KmeVxOY";
const supabase = createClient(supabaseUrl, supabaseKey);

let currentUserType = null; // "auth" or "guest"
let currentGuestUser = null; // guest user 資料

// ✅ Email 註冊
window.signUp = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功，請至信箱點擊確認信件！");
};

// ✅ Email 登入
window.signIn = async () => {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("請輸入 Email 與密碼");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("登入失敗：" + error.message);

  currentUserType = "auth";
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = email;
  await checkSettings();
};

// ✅ 登出
window.signOut = async () => {
  await supabase.auth.signOut();
  currentUserType = null;
  currentGuestUser = null;
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
};

// ✅ 訪客註冊
window.guestSignUp = async () => {
  const nickname = document.getElementById("guest-nickname").value;
  const password = document.getElementById("guest-password").value;
  if (!nickname || !password) return alert("請輸入暱稱與密碼");

  const { data: existing } = await supabase.from("guest_users").select("*").eq("nickname", nickname).single();
  if (existing) return alert("暱稱已被使用，請換一個");

  const { error } = await supabase.from("guest_users").insert([{ nickname, password }]);
  if (error) return alert("註冊失敗：" + error.message);
  alert("註冊成功！請使用暱稱登入。");
};

// ✅ 訪客登入
window.guestSignIn = async () => {
  const nickname = document.getElementById("guest-nickname").value;
  const password = document.getElementById("guest-password").value;
  if (!nickname || !password) return alert("請輸入暱稱與密碼");

  const { data, error } = await supabase.from("guest_users").select("*").eq("nickname", nickname).eq("password", password).single();
  if (error || !data) return alert("登入失敗：暱稱或密碼錯誤");

  currentUserType = "guest";
  currentGuestUser = data;

  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = data.nickname;

  await checkSettings();
};

// ✅ 設定檢查
async function checkSettings() {
  if (currentUserType === "guest") {
    const { data } = await supabase.from("guest_settings").select("*").eq("user_id", currentGuestUser.id).single();
    handleSettings(data);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
    handleSettings(data);
  }
}

function handleSettings(data) {
  if (!data || !data.hourly_rate || !data.payday) {
    document.getElementById("settings-form").style.display = "block";
    document.getElementById("edit-settings-btn").style.display = "none";
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("end-btn").style.display = "none";
  } else {
    document.getElementById("hourly-rate").value = data.hourly_rate;
    document.getElementById("payday").value = data.payday;
    document.getElementById("settings-form").style.display = "none";
    document.getElementById("edit-settings-btn").style.display = "inline-block";
    document.getElementById("start-btn").style.display = "inline-block";
    document.getElementById("end-btn").style.display = "inline-block";
    fetchStats();
    updateStatus();
  }
}

// ✅ 儲存設定
window.saveSettings = async () => {
  const hourly_rate = parseInt(document.getElementById("hourly-rate").value);
  const payday = parseInt(document.getElementById("payday").value);

  if (currentUserType === "guest") {
    await supabase.from("guest_settings").upsert({
      user_id: currentGuestUser.id,
      hourly_rate,
      payday
    });
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      hourly_rate,
      payday
    });
  }

  alert("設定已儲存！");
  document.getElementById("settings-form").style.display = "none";
  document.getElementById("edit-settings-btn").style.display = "inline-block";
  document.getElementById("start-btn").style.display = "inline-block";
  document.getElementById("end-btn").style.display = "inline-block";

  fetchStats();
  updateStatus();
};

// ✅ 開始摸魚
window.startMoyu = () => {
  localStorage.setItem("startTime", Date.now().toString());
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

  if (currentUserType === "guest") {
    await supabase.from("guest_moyu_records").insert({
      user_id: currentGuestUser.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_min: durationMin
    });
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("moyu_records").insert({
      user_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_min: durationMin
    });
  }

  localStorage.removeItem("startTime");
  document.getElementById("start-btn").disabled = false;
  document.getElementById("end-btn").disabled = true;
  fetchStats();
  updateStatus();
};

// ✅ 撈統計資料
async function fetchStats() {
  let userId, tableName;
  if (currentUserType === "guest") {
    userId = currentGuestUser.id;
    tableName = "guest_moyu_records";
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user.id;
    tableName = "moyu_records";
  }

  const { data, error } = await supabase.from(tableName).select("*").eq("user_id", userId);
  if (error) return console.error("統計撈取錯誤：", error);

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

function updateStatus() {
  if (localStorage.getItem("startTime")) {
    document.getElementById("status").textContent = "🐟 正在摸魚中...";
  } else {
    document.getElementById("status").textContent = "你目前還沒開始摸魚喔～";
  }
}
