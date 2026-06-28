import { useState, useEffect } from "react";
import * as htmlToImage from "html-to-image";
import { 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  Github,
  Sparkles,
  Search,
  User,
  ArrowLeft,
  Share2,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Receipt from "./components/Receipt";
import { ReceiptData } from "./types";

export default function App() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<"30" | "6" | "all">("30");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "copied_insta" | "copied_tiktok" | "failed">("idle");
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  // Close share dropdown when clicking outside
  useEffect(() => {
    if (!shareDropdownOpen) return;
    const handleOutsideClick = () => {
      setShareDropdownOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [shareDropdownOpen]);

  const handleTryDemo = (demoUser: string) => {
    setUsername(demoUser);
    handleFetch(demoUser);
  };

  const handleFetch = async (targetUsername?: string) => {
    const activeUsername = targetUsername || username.trim();
    if (!activeUsername) {
      setError("Please enter a valid GitHub username.");
      return;
    }

    // Clean username if it was entered as a URL (e.g. github.com/username)
    let cleanedUser = activeUsername;
    if (cleanedUser.includes("github.com/")) {
      const parts = cleanedUser.split("github.com/");
      cleanedUser = parts[parts.length - 1].split("/")[0].split("?")[0];
    }
    cleanedUser = cleanedUser.replace(/^\/+|\/+$/g, "").trim();

    setLoading(true);
    setError(null);
    setReceiptData(null);

    try {
      const res = await fetch(`/api/github-receipt/${encodeURIComponent(cleanedUser)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to fetch GitHub stats.");
      }
      const data: ReceiptData = await res.json();
      setReceiptData(data);
    } catch (err: any) {
      console.error("[Devciptify] Fetch error:", err);
      setError(err.message || "Could not generate receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPng = async () => {
    const container = document.getElementById("receipt-container");
    if (!container || !receiptData) return;

    try {
      setIsExporting(true);
      const dataUrl = await htmlToImage.toPng(container, {
        pixelRatio: 3, // Ultra-sharp print-ready quality
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `devciptify-github-${receiptData.username.toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("[Devciptify] Export PNG failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setReceiptData(null);
    setError(null);
    setUsername("");
  };

  // Mount effect to check for shared profile query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user") || params.get("username");
    if (userParam) {
      const cleaned = userParam.trim();
      setUsername(cleaned);
      handleFetch(cleaned);
    }
  }, []);

  const handleShareLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!receiptData) return;
    const shareUrl = `${window.location.origin}?user=${encodeURIComponent(receiptData.username)}`;
    const shareText = `Check out my GitHub developer receipt on Devciptify! Generated for @${receiptData.username}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Devciptify - GitHub Dev Receipt",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.log("Web Share canceled or failed, falling back to clipboard:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 3000);
      setShareDropdownOpen(false);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      setShareStatus("failed");
      setTimeout(() => setShareStatus("idle"), 3000);
    }
  };

  const shareImageOrFallback = async (platform: "instagram" | "tiktok" | "generic", e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!receiptData) return;

    const container = document.getElementById("receipt-container");
    if (!container) return;

    try {
      setIsExporting(true);
      const blob = await htmlToImage.toBlob(container, {
        pixelRatio: 2.5,
        cacheBust: true,
      });
      setIsExporting(false);

      if (!blob) throw new Error("Could not generate image blob");

      const file = new File([blob], `devciptify-${receiptData.username.toLowerCase()}.png`, { type: "image/png" });

      // Try file sharing via Web Share API
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Devciptify GitHub Receipt",
          text: `Check out my GitHub stats on Devciptify! Generated for @${receiptData.username}`,
        });
        setShareDropdownOpen(false);
        return;
      }
    } catch (err) {
      console.log("Native file sharing not supported or canceled, falling back:", err);
    } finally {
      setIsExporting(false);
    }

    // Fallback if native file share is unsupported (e.g. desktop)
    const shareUrl = `${window.location.origin}?user=${encodeURIComponent(receiptData.username)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (platform === "instagram") {
        setShareStatus("copied_insta");
      } else if (platform === "tiktok") {
        setShareStatus("copied_tiktok");
      } else {
        setShareStatus("copied");
      }
      setTimeout(() => setShareStatus("idle"), 3000);
      setShareDropdownOpen(false);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      setShareStatus("failed");
      setTimeout(() => setShareStatus("idle"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-800 flex flex-col font-sans selection:bg-neutral-200">
      {/* Dynamic Background subtle overlay */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#e5e7eb 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 z-10">
        <AnimatePresence mode="wait">
          {!receiptData ? (
            /* =================== STEP 1: WELCOME & INPUT =================== */
            <motion.div
              key="input-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md text-center space-y-8"
            >
              {/* Header Title */}
              <div className="space-y-2">
                <h1 className="font-sans font-black text-5xl tracking-[0.08em] text-neutral-900 uppercase">
                  DEVCIPTIFY
                </h1>
                <p className="text-sm font-semibold tracking-widest text-neutral-500 uppercase">
                  GitHub Dev Receipt Generator
                </p>
              </div>

              {/* Simple Input Card */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-xl shadow-neutral-200/50 space-y-6 text-left">
                <div className="space-y-1.5">
                  <label htmlFor="git-username" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Enter GitHub Username
                  </label>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Enter your profile name to scan your commits, merged pull requests, and top languages from the last 30 days.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">@</span>
                    <input 
                      id="git-username"
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. torvalds or octocat"
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && username.trim() && !loading) {
                          handleFetch();
                        }
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3.5 pl-9 pr-4 text-sm font-mono text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => handleFetch()}
                    disabled={loading || !username.trim()}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-neutral-950/10 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>GENERATING RECEIPT...</span>
                      </>
                    ) : (
                      <>
                        <span>GET RECEIPT</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-red-700 font-medium"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Spotlight suggestions */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Quick Examples
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: "tj", label: "TJ" },
                    { name: "yyx990803", label: "Evan You" },
                    { name: "torvalds", label: "Torvalds" }
                  ].map((dev) => (
                    <button
                      key={dev.name}
                      onClick={() => handleTryDemo(dev.name)}
                      disabled={loading}
                      className="bg-white hover:bg-neutral-50 active:scale-[0.98] border border-neutral-200 rounded-xl p-3 text-center transition-all cursor-pointer shadow-sm text-xs font-mono font-bold text-neutral-700"
                    >
                      @{dev.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* =================== STEP 2: DISPLAY RECEIPT =================== */
            <motion.div
              key="receipt-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full flex flex-col items-center space-y-4"
            >
              {/* Top Bar with Social Share in Top Right */}
              <div className="w-full max-w-[360px] flex items-center justify-between px-1">
                <span className="text-[10px] font-mono tracking-wider text-neutral-400 font-bold uppercase">
                  Receipt Ready
                </span>
                <div className="relative flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareDropdownOpen(!shareDropdownOpen);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 active:scale-95 transition-all shadow-sm font-mono text-[10px] font-bold uppercase cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Share</span>
                  </button>

                  <AnimatePresence>
                    {shareDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] py-1.5 z-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Share Image Directly */}
                        <button
                          onClick={(e) => shareImageOrFallback("generic", e)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-neutral-800 bg-neutral-50 hover:bg-neutral-100 hover:text-neutral-950 transition-colors text-xs font-semibold cursor-pointer border-b border-neutral-100 rounded-t-xl"
                        >
                          <Share2 size={13} className="text-neutral-700 animate-pulse" />
                          <span>Share Image Directly</span>
                        </button>

                        <div className="my-1" />

                        {/* Twitter / X */}
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            `Just generated my Devciptify GitHub receipt! Check out my stats: `
                          )}&url=${encodeURIComponent(
                            `${window.location.origin}?user=${encodeURIComponent(receiptData.username)}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current text-neutral-600" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>Share on X</span>
                        </a>

                        {/* LinkedIn */}
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                            `${window.location.origin}?user=${encodeURIComponent(receiptData.username)}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current text-neutral-600" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          <span>Share on LinkedIn</span>
                        </a>

                        {/* Instagram */}
                        <button
                          onClick={(e) => shareImageOrFallback("instagram", e)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.2] text-neutral-600" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                          </svg>
                          <span>Instagram (Share Image)</span>
                        </button>

                        {/* TikTok */}
                        <button
                          onClick={(e) => shareImageOrFallback("tiktok", e)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current text-neutral-600" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.19 1.12 1.25 2.72 1.93 4.38 2.03v3.82c-1.89-.02-3.73-.72-5.14-2.01-.13-.12-.25-.26-.37-.39v7.86c.04 4.54-3.52 8.41-8.06 8.49-4.9.23-9.13-3.61-9.04-8.52.12-4.47 3.98-8.09 8.46-7.92.51.01 1.01.08 1.5.21v3.91c-1.12-.34-2.35-.14-3.32.53-.98.67-1.54 1.83-1.48 3.02.09 2.13 1.99 3.81 4.13 3.7 2.03-.07 3.63-1.74 3.63-3.77-.01-5.11 0-10.22-.01-15.33z"/>
                          </svg>
                          <span>TikTok (Share Image)</span>
                        </button>

                        <div className="my-1 border-t border-neutral-100" />

                        {/* Copy Link */}
                        <button
                          onClick={(e) => handleShareLink(e)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <Share2 size={14} className="text-neutral-600" />
                          <span>Copy Direct Link</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Receipt Wrapper with custom elegant shadow */}
              <div className="shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-3xl overflow-hidden bg-[#f3f1ec]">
                <Receipt data={receiptData} />
              </div>

              {/* Interactive Control Deck directly below */}
              <div className="w-full max-w-[360px] flex flex-col gap-3">
                <button 
                  onClick={handleExportPng}
                  disabled={isExporting}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-neutral-950/10 disabled:opacity-50"
                >
                  {isExporting ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <Download size={14} className="text-white" />
                  )}
                  <span>{isExporting ? "DOWNLOAD DISPATCHING..." : "DOWNLOAD RECEIPT"}</span>
                </button>
                
                <button 
                  onClick={handleReset}
                  disabled={isExporting}
                  className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>ANOTHER RECEIPT</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tiny Signature Footer */}
      <footer className="py-6 text-center text-[10px] font-mono tracking-widest text-neutral-400 uppercase shrink-0">
        &copy; 2026 DEVCIPTIFY &bull; POWERED BY GITHUB GRAPHQL
      </footer>

      {/* Floating Micro-Toast Notification */}
      <AnimatePresence>
        {shareStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase shadow-xl flex items-center gap-2.5 border border-neutral-800"
          >
            {shareStatus === "failed" ? (
              <AlertTriangle size={14} className="text-red-400 animate-bounce" />
            ) : (
              <Check size={14} className="text-green-400 animate-pulse" />
            )}
            <span>
              {shareStatus === "copied" && "Link Copied!"}
              {shareStatus === "copied_insta" && "Link Copied for Instagram!"}
              {shareStatus === "copied_tiktok" && "Link Copied for TikTok!"}
              {shareStatus === "failed" && "Failed to copy link!"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
