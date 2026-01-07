import { useState } from "react";

const OBFUSCATED_SECRET = [109, 111, 100, 101, 115, 105, 103, 110]; // "modesign" as char codes

function decodeSecret(arr: number[]) {
  return String.fromCharCode(...arr);
}

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === decodeSecret(OBFUSCATED_SECRET)) {
      localStorage.setItem("isLoggedIn", "1");
      onSuccess();
    } else {
      setError("Invalid code");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ minWidth: 320, padding: 32, borderRadius: 8, boxShadow: "0 2px 16px #0002", background: "#fff" }}>
        <h2 style={{ marginBottom: 24 }}>Login</h2>
        <input
          type="password"
          placeholder="Enter secret code"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 16, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 4, background: "#222", color: "#fff", border: 0 }}>Login</button>
        {error && <div style={{ color: "#c00", marginTop: 12 }}>{error}</div>}
      </form>
    </div>
  );
}
