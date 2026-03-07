export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <h1>SkillSwap Backend API</h1>
      <p>This is the backend API server for the SkillSwap platform.</p>

      <h2>Available Endpoints</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #333", textAlign: "left" }}>
            <th style={{ padding: "8px" }}>Method</th>
            <th style={{ padding: "8px" }}>Endpoint</th>
            <th style={{ padding: "8px" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["GET", "/api/user/me", "Current user profile"],
            ["GET", "/api/skills", "Skill listings (category, search)"],
            ["GET", "/api/sessions", "Exchange sessions (filter, dashboard)"],
            ["GET", "/api/contacts", "Messaging contacts"],
            ["GET", "/api/messages/:contactId", "Chat messages"],
            ["POST", "/api/messages/:contactId", "Send message"],
            ["GET", "/api/posts", "Community posts"],
            ["GET", "/api/community", "Community activity updates"],
            ["GET", "/api/user-posts", "Current user posts"],
            ["GET", "/api/reviews", "User reviews"],
            ["GET", "/api/similar-experts", "Similar skill experts"],
            ["POST", "/api/ai/process", "AI translate / contract / schedule"],
            ["POST", "/api/ai/match/chat", "AI matching assistant"],
            ["POST", "/api/seed", "Seed demo data"],
          ].map(([method, path, desc], i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px" }}>
                <code style={{ background: method === "POST" ? "#e8f5e9" : "#e3f2fd", padding: "2px 6px", borderRadius: 4 }}>
                  {method}
                </code>
              </td>
              <td style={{ padding: "8px" }}><code>{path}</code></td>
              <td style={{ padding: "8px" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Frontend Connection</h2>
      <p>
        Set <code>NEXT_PUBLIC_API_BASE_URL</code> in the frontend to this server URL to connect.
      </p>
    </main>
  );
}
