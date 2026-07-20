"use client"

import React, { useEffect, useCallback, useRef, useState, Component, ErrorInfo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Sparkles,
  Loader2,
  Search,
  Filter,
  FileDown,
  MapPin,
  MessageCircle,
  Shield,
  Zap,
  AlertTriangle,
} from "lucide-react"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onPay: () => void
  isPaying: boolean
}

const FEATURES = [
  { icon: Search, label: "Search Any College", desc: "Instantly search any college by name or code" },
  { icon: Filter, label: "Search by Branch", desc: "Filter and sort recommendations by branch" },
  { icon: Sparkles, label: "AI Ranking", desc: "Dynamic eligibility-based smart ranking" },
  { icon: Shield, label: "Complete College List", desc: "Unlock all matching options beyond top 5" },
  { icon: FileDown, label: "PDF Report", desc: "Download and print complete CAP predictions" },
  { icon: MapPin, label: "CAP Guidance", desc: "Expert guidance for CAP round submission" },
  { icon: Zap, label: "Vacant Seat Tracker", desc: "Real-time vacant seat tracker access" },
  { icon: MessageCircle, label: "WhatsApp Support", desc: "Priority updates and support on WhatsApp" },
]

// Fallback error UI inside a styled card
function ErrorFallback({ error, onRetry, onClose }: { error: Error; onRetry: () => void; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          padding: "24px",
          textAlign: "center",
          boxShadow: "0 20px 48px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle style={{ width: 22, height: 22, color: "#ef4444" }} />
        </div>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
          Something went wrong
        </h3>
        <p style={{ margin: "8px 0 20px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
          The payment modal failed to load correctly. Please try again.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "50px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "50px",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "none",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// React Class Error Boundary to wrap the UpgradeModal
class UpgradeModalErrorBoundary extends Component<
  UpgradeModalProps & { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: UpgradeModalProps & { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("UpgradeModal Error Boundary caught an error:", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error || new Error("Unknown error")}
          onRetry={this.handleRetry}
          onClose={this.props.onClose}
        />
      )
    }

    return this.props.children
  }
}

// Inner Modal Component
function UpgradeModalInner({ isOpen, onClose, onPay, isPaying }: UpgradeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only mounting on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll + account for browser scrollbar shifts
  useEffect(() => {
    if (!isOpen || !mounted) return

    const origOverflow = document.body.style.overflow
    const origPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)

    // Focus lock entry
    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = origOverflow
      document.body.style.paddingRight = origPaddingRight
      window.removeEventListener("keydown", handleKey)
    }
  }, [isOpen, mounted, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose]
  )

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Inject style rules for customized hover/active effects */}
          <style>{`
            .aw-btn-pay:hover:not(:disabled) {
              filter: brightness(1.08);
              box-shadow: 0 6px 28px rgba(37, 99, 235, 0.45);
              transform: translateY(-1px);
            }
            .aw-btn-pay:active:not(:disabled) {
              transform: translateY(0);
            }
            .aw-close-btn:hover {
              background: #f1f5f9 !important;
              color: #0f172a !important;
            }
            .aw-cancel-btn:hover {
              color: #475569 !important;
            }
            /* Custom styled slim scrollbar for features grid */
            .aw-modal-scroll::-webkit-scrollbar {
              width: 5px;
            }
            .aw-modal-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .aw-modal-scroll::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            .aw-modal-scroll::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>

          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2147483647, /* Keep above navigation and WhatsApp widget */
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Unlock Premium Prediction"
          >
            {/* Dialog Card Container */}
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", duration: 0.38, bounce: 0.22 }}
              style={{
                position: "relative",
                width: "92vw",
                maxWidth: "500px",
                maxHeight: "88vh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.04)",
                outline: "none",
                overflow: "hidden",
              }}
            >
              {/* HEADER (Sticky) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "18px 20px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  flexShrink: 0,
                  background: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles style={{ width: 19, height: 19, color: "#2563eb" }} />
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#0f172a",
                        lineHeight: 1.25,
                      }}
                    >
                      Unlock Premium Prediction
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#64748b", lineHeight: 1.4 }}>
                      Unlock advanced search, filters, AI ranking and complete college predictions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="aw-close-btn"
                  style={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    transition: "all 150ms ease",
                    padding: 0,
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>

              {/* BODY (Scrollable) */}
              <div
                className="aw-modal-scroll"
                style={{
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  flex: 1,
                  padding: "16px 20px",
                }}
              >
                {/* Benefits listing */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {FEATURES.map((feat) => (
                    <div
                      key={feat.label}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "9px",
                        padding: "9px 11px",
                        borderRadius: "12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "7px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <feat.icon style={{ width: 12, height: 12, color: "#2563eb" }} />
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "11px",
                            fontWeight: 650,
                            color: "#0f172a",
                            lineHeight: 1.3,
                          }}
                        >
                          {feat.label}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "9.5px", color: "#94a3b8", lineHeight: 1.45 }}>
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing / Offer Banner */}
                <div
                  style={{
                    marginTop: "16px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)",
                    padding: "16px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      pointerEvents: "none",
                    }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#93c5fd",
                    }}
                  >
                    Today Only — Limited Offer
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "center",
                      gap: "8px",
                      marginTop: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#93c5fd",
                        textDecoration: "line-through",
                        fontWeight: 600,
                      }}
                    >
                      ₹2,999
                    </span>
                    <span
                      style={{
                        fontSize: "36px",
                        fontWeight: 800,
                        color: "#ffffff",
                        lineHeight: 1,
                      }}
                    >
                      ₹499
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#bfdbfe" }}>
                    One-time payment · Complete Predictor access
                  </p>
                </div>

                {/* Trust label */}
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    margin: "12px 0 0",
                    fontSize: "10px",
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <Shield style={{ width: 11, height: 11 }} />
                  Secured by Razorpay · Instant Activation
                </p>
              </div>

              {/* FOOTER (Sticky) */}
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid #f1f5f9",
                  flexShrink: 0,
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  /* Safe areas for iOS devices */
                  paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
                }}
              >
                <button
                  type="button"
                  onClick={onPay}
                  disabled={isPaying}
                  className="aw-btn-pay"
                  style={{
                    width: "100%",
                    borderRadius: "50px",
                    background: "linear-gradient(135deg, #2563eb 0%, #4338ca 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "14px",
                    padding: "13px 24px",
                    border: "none",
                    cursor: isPaying ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 20px rgba(37, 99, 235, 0.3)",
                    transition: "all 200ms ease",
                    opacity: isPaying ? 0.8 : 1,
                  }}
                >
                  {isPaying ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: "aw-spin 1s linear infinite" }} />
                      Processing payment...
                    </>
                  ) : (
                    <>
                      <Zap style={{ width: 14, height: 14 }} />
                      Pay ₹499 &amp; Unlock Instantly
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="aw-cancel-btn"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    padding: "2px 0",
                    transition: "color 150ms ease",
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Export wrapped UpgradeModal with ErrorBoundary
export function UpgradeModal(props: UpgradeModalProps) {
  return (
    <UpgradeModalErrorBoundary {...props}>
      <UpgradeModalInner {...props} />
    </UpgradeModalErrorBoundary>
  )
}

