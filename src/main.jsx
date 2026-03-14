import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("CRM Error Boundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", padding: 40 } },
        React.createElement("div", { style: { textAlign: "center", maxWidth: 500 } },
          React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "⚠️"),
          React.createElement("h1", { style: { fontSize: 22, fontWeight: 700, color: "#1B2A4A", margin: "0 0 12px" } }, "Something went wrong"),
          React.createElement("p", { style: { fontSize: 14, color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 } }, "The CRM encountered an unexpected error. Your data is safe — try refreshing the page."),
          React.createElement("button", { onClick: () => window.location.reload(), style: { padding: "12px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #E63946, #C5303C)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } }, "Refresh Page"),
          React.createElement("pre", { style: { marginTop: 20, padding: 12, background: "#F1F5F9", borderRadius: 8, fontSize: 11, color: "#94A3B8", textAlign: "left", maxHeight: 100, overflow: "auto" } }, String(this.state.error))
        )
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
