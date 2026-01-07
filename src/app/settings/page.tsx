"use client";

export default function SettingsPage() {
  function handleLogout() {
    localStorage.removeItem("isLoggedIn");
    window.location.reload();
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 2px 16px #0001" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Settings</h1>
      <button
        onClick={handleLogout}
        style={{ padding: "10px 24px", borderRadius: 4, background: "#c00", color: "#fff", border: 0, fontWeight: 600, cursor: "pointer" }}
      >
        Logout
      </button>
    </div>
  );
}
