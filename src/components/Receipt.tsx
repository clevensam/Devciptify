import { motion } from "motion/react";
import { ReceiptData } from "../types";

interface ReceiptProps {
  data: ReceiptData | null;
}

// Format date into the target uppercase style: "MONDAY, DECEMBER 1, 2025"
function getFormattedDate(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return d.toLocaleDateString("en-US", options).toUpperCase();
}

export default function Receipt({ data }: ReceiptProps) {
  if (!data) return null;

  // Generate 33-tooth zigzag clip-path dynamically
  const teethCount = 33;
  const points = ["0% 0%", "100% 0%"];
  for (let i = teethCount; i >= 0; i--) {
    const x = (100 / teethCount) * i;
    const y = i % 2 === 0 ? 100 : 97.2;
    points.push(`${x}% ${y}%`);
  }
  const clipPathString = `polygon(${points.join(", ")})`;

  // Build the item list precisely using the Receiptify format style
  const items = [
    { qty: "01", item: "COMMITS SUBMITTED", amt: data.totalCommits.toString() },
    { qty: "02", item: "PULL REQUESTS MERGED", amt: data.totalPRs.toString() },
    { qty: "03", item: "ISSUES COMPLETED", amt: data.totalIssues.toString() },
    { qty: "04", item: "PULL REQUEST REVIEWS", amt: data.totalReviews.toString() },
    { qty: "05", item: `EST. WORKING HOURS - CODINGTIME`, amt: data.codingHours.toString() },
    { qty: "06", item: `MAX ACTIVE STREAK - ENGAGEMENT`, amt: data.streak.toString() },
    ...data.topLanguages.slice(0, 3).map((lang, idx) => ({
      qty: (idx + 7).toString().padStart(2, "0"),
      item: `${lang.name.toUpperCase()}`,
      amt: Math.round(lang.percentage).toString(),
    })),
  ];

  return (
    <div
      id="receipt-container"
      style={{
        width: "360px",
        backgroundColor: "#f3f1ec", // High fidelity classic thermal paper color
        color: "#1a1a1a",
        clipPath: clipPathString,
        paddingBottom: "45px",
      }}
      className="relative select-none text-left shadow-2xl px-6 py-8 font-anonymous overflow-hidden border border-gray-200/40"
    >
      {/* Thermal Print Line Overlay / Grain Texture */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.18]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.06),
            rgba(0, 0, 0, 0.06) 1px,
            transparent 1px,
            transparent 3px
          )`
        }}
      />

      {/* Main GITSLIP styled header */}
      <div className="text-center mb-1">
        <h1 
          className="font-sans font-black text-[2.45rem] tracking-[0.06em] text-neutral-800 uppercase"
          id="receipt-logo"
        >
          GITSLIP
        </h1>
        <p className="font-anonymous text-[11px] font-bold text-neutral-600 tracking-[0.25em] uppercase mt-1 mb-6">
          LAST 30 DAYS
        </p>
      </div>

      {/* Metadata / Order Info Block */}
      <div className="font-anonymous text-[11px] leading-relaxed text-neutral-800 tracking-wide font-bold space-y-0.5 mb-4 uppercase">
        <div>
          ORDER #{data.orderNumber || "0001"} FOR {data.username.toUpperCase()}
        </div>
        <div>
          {getFormattedDate(data.date)}
        </div>
      </div>

      {/* Dashed Separator */}
      <div className="border-b border-dashed border-neutral-400/80 my-3"></div>

      {/* Column Headers */}
      <div className="grid grid-cols-[24px_1fr_56px] gap-2 text-[11px] font-bold text-neutral-700 tracking-wider pb-1">
        <span>QTY</span>
        <span className="text-left">ITEM</span>
        <span className="text-right">AMT</span>
      </div>

      {/* Dashed Separator */}
      <div className="border-b border-dashed border-neutral-400/80 mb-3"></div>

      {/* Table Rows with Staggered Animations */}
      <div className="space-y-2.5 mb-4">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: index * 0.08,
              ease: "easeOut",
            }}
            className="grid grid-cols-[24px_1fr_56px] gap-2 text-[11px] font-bold text-neutral-800 tracking-wide leading-tight items-baseline"
          >
            <span className="select-none">{item.qty}</span>
            <span className="text-left break-words uppercase pr-1 font-bold">
              {item.item}
            </span>
            <span className="text-right font-bold whitespace-nowrap">
              {item.amt}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Dashed Separator */}
      <div className="border-b border-dashed border-neutral-400/80 my-4"></div>

      {/* Totals Section */}
      <div className="text-[11px] font-bold text-neutral-800 space-y-1 mb-4">
        <div className="flex justify-between uppercase">
          <span>ITEM COUNT</span>
          <span>{items.length}</span>
        </div>
        <div className="flex justify-between uppercase">
          <span>TOTAL TIME IN HOURS</span>
          <span>{data.codingHours}</span>
        </div>
      </div>

      {/* Dashed Separator */}
      <div className="border-b border-dashed border-neutral-400/80 my-4"></div>

      {/* Card Information mimicking Receiptify */}
      <div className="text-[11px] font-bold text-neutral-800 leading-relaxed space-y-0.5 mb-4 uppercase">
        <div>CARD **** **** **** {new Date(data.date || Date.now()).getFullYear()}</div>
        <div>CARDHOLDER {data.username.toUpperCase()}</div>
      </div>

      {/* Dashed Separator */}
      <div className="border-b border-dashed border-neutral-400/80 my-4"></div>

      {/* Thank you note */}
      <div className="text-center text-[11px] font-bold text-neutral-800 tracking-wider mb-5 uppercase">
        THANK YOU FOR VISITING!
      </div>

      {/* Barcode representation */}
      <div className="flex flex-col items-center justify-center mb-5">
        <div className="w-52 h-11 overflow-hidden opacity-[0.85] mix-blend-multiply">
          <img
            src="/barcode.svg"
            alt="Receipt Barcode"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <span className="text-[9px] tracking-[0.25em] mt-1.5 font-bold font-mono text-neutral-600 uppercase">
          {data.username.toLowerCase()}.github.io
        </span>
      </div>

      {/* Bottom Branding mimicking Spotify Logo */}
      <div className="flex items-center justify-center gap-1.5 text-neutral-800 opacity-95">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span className="font-sans font-extrabold text-sm tracking-tight">Gitslip</span>
      </div>

      {/* Simulated/Demo mode watermark */}
      {data.simulated && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-red-500/20 text-red-600/10 font-bold font-anonymous text-6xl select-none pointer-events-none rotate-[20deg] bg-white/20 px-4 py-1.5 rounded uppercase">
          Demo Mode
        </div>
      )}
    </div>
  );
}
