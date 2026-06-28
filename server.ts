import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Force Node to prefer IPv4 (helps in certain sandboxed environments)
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple in-memory cache
// Key: username, Value: { data: any, timestamp: number }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper to generate realistic simulated data when GITHUB_TOKEN is missing
function generateSimulatedData(username: string) {
  const normalizedUser = username.trim().toLowerCase();
  
  // Seed-like generation based on username length and characters to make it look semi-consistent
  const seed = normalizedUser.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const reposCount = 15 + (seed % 25);
  const commits = 45 + (seed % 180);
  const prs = 5 + (seed % 25);
  const issues = 3 + (seed % 15);
  const reviews = 2 + (seed % 12);
  const totalContributions = commits + prs + issues + reviews;
  
  const codingHours = parseFloat((commits * 0.5 + prs * 2.5 + issues * 1.5 + reviews * 2.0).toFixed(1));
  const energyLevel = Math.min(100, Math.max(10, Math.round((commits * 0.8) + (prs * 5) + (issues * 3) + (reviews * 4))));
  
  let energyLevelLabel = "STEADY STATE 🟢";
  if (energyLevel >= 85) energyLevelLabel = "OVERCHARGED 🔥";
  else if (energyLevel >= 60) energyLevelLabel = "HYPERACTIVE ⚡";
  else if (energyLevel >= 30) energyLevelLabel = "STEADY STATE 🟢";
  else if (energyLevel >= 15) energyLevelLabel = "EFFICIENT 🌀";
  else energyLevelLabel = "ZEN MODE 🌸";

  // Predefined languages list
  const allLanguages = [
    { name: "TypeScript", color: "#3178c6" },
    { name: "JavaScript", color: "#f1e05a" },
    { name: "Python", color: "#3572A5" },
    { name: "Rust", color: "#dea584" },
    { name: "Go", color: "#00ADD8" },
    { name: "HTML", color: "#e34c26" },
    { name: "CSS", color: "#563d7c" },
    { name: "C++", color: "#f34b7d" },
  ];

  const langIdx1 = seed % allLanguages.length;
  const langIdx2 = (seed + 3) % allLanguages.length;
  
  const lang1 = allLanguages[langIdx1];
  const lang2 = allLanguages[langIdx2 !== langIdx1 ? langIdx2 : (langIdx2 + 1) % allLanguages.length];
  
  const pct1 = 55 + (seed % 25);
  const pct2 = 100 - pct1;
  
  const topLanguages = [
    { name: lang1.name, color: lang1.color, percentage: pct1 },
    { name: lang2.name, color: lang2.color, percentage: pct2 }
  ];

  // Generate a fake calendar for streak calculation
  const last30Days: { date: string; contributionCount: number }[] = [];
  let currentStreak = 0;
  let maxStreak = 0;
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    // Determine active days using pseudo-random logic
    const isContributor = ((seed + i) % 7) < 5; // 5 out of 7 days active
    const count = isContributor ? 1 + ((seed * i) % 8) : 0;
    
    last30Days.push({ date: dateStr, contributionCount: count });

    if (count > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // Create formatted receipt date
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    year: "numeric", 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit",
    hour12: false
  };
  const dateFormatted = now.toLocaleDateString("en-US", options);
  const orderHash = Math.abs(seed).toString(16).toUpperCase().padStart(4, "0");
  const orderNumber = `DEV-${orderHash}-${now.getMonth() + 1}${now.getDate()}`;

  return {
    username: username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    avatarUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60`, // stylized background avatar
    bio: `A brilliant developer building awesome projects on GitHub. (Simulated Profile)`,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 years ago
    followers: 12 + (seed % 150),
    following: 10 + (seed % 80),
    totalCommits: commits,
    totalPRs: prs,
    totalIssues: issues,
    totalReviews: reviews,
    totalContributions: totalContributions,
    codingHours: codingHours,
    energyLevel: energyLevel,
    energyLevelLabel: energyLevelLabel,
    topLanguages: topLanguages,
    streak: maxStreak,
    contributionHistory: last30Days,
    orderNumber: orderNumber,
    date: dateFormatted,
    simulated: true
  };
}

// API endpoint to fetch GitHub stats via GraphQL API
app.get("/api/github-receipt/:username", async (req, res) => {
  const username = req.params.username.trim();
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Check cache first
  const cached = cache.get(username.toLowerCase());
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return res.json(cached.data);
  }

  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    // If GITHUB_TOKEN is not configured, fall back to simulated data with an explicit flag
    console.log(`[Devciptify] GITHUB_TOKEN not configured. Returning simulated data for ${username}.`);
    const simData = generateSimulatedData(username);
    cache.set(username.toLowerCase(), { data: simData, timestamp: Date.now() });
    return res.json(simData);
  }

  try {
    // GraphQL query to fetch the user profile, repositories, and contribution statistics
    const query = `
      query($username: String!) {
        user(login: $username) {
          name
          login
          avatarUrl
          bio
          createdAt
          followers {
            totalCount
          }
          following {
            totalCount
          }
          repositories(first: 30, orderBy: {field: STARGAZERS, direction: DESC}) {
            nodes {
              name
              stargazerCount
              languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            totalPullRequestReviewContributions
            restrictedContributionsCount
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Devciptify-Receipt-Generator"
      },
      body: JSON.stringify({
        query,
        variables: { username }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Devciptify] GitHub API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }

    const json = await response.json();
    
    if (json.errors && json.errors.length > 0) {
      console.error("[Devciptify] GraphQL errors:", json.errors);
      // If the user is not found, or another error, handle it
      const isNotFound = json.errors.some((e: any) => e.type === "NOT_FOUND");
      if (isNotFound) {
        return res.status(404).json({ error: `GitHub user "${username}" not found.` });
      }
      return res.status(500).json({ error: json.errors[0].message || "GraphQL query error" });
    }

    const userData = json.data?.user;
    if (!userData) {
      return res.status(404).json({ error: "User not found or inaccessible." });
    }

    // Process and derive metrics
    const profileName = userData.name || userData.login;
    const avatarUrl = userData.avatarUrl;
    const bio = userData.bio || "No bio provided.";
    const createdAt = userData.createdAt;
    const followers = userData.followers?.totalCount || 0;
    const following = userData.following?.totalCount || 0;

    const contribs = userData.contributionsCollection || {};
    const commits = contribs.totalCommitContributions || 0;
    const prs = contribs.totalPullRequestContributions || 0;
    const issues = contribs.totalIssueContributions || 0;
    const reviews = contribs.totalPullRequestReviewContributions || 0;
    const totalContributions = commits + prs + issues + reviews;

    const codingHours = parseFloat((commits * 0.5 + prs * 2.5 + issues * 1.5 + reviews * 2.0).toFixed(1));
    const energyLevel = Math.min(100, Math.max(10, Math.round((commits * 0.8) + (prs * 5) + (issues * 3) + (reviews * 4))));
    
    let energyLevelLabel = "STEADY STATE 🟢";
    if (energyLevel >= 85) energyLevelLabel = "OVERCHARGED 🔥";
    else if (energyLevel >= 60) energyLevelLabel = "HYPERACTIVE ⚡";
    else if (energyLevel >= 30) energyLevelLabel = "STEADY STATE 🟢";
    else if (energyLevel >= 15) energyLevelLabel = "EFFICIENT 🌀";
    else energyLevelLabel = "ZEN MODE 🌸";

    // Aggregate languages
    const langSizes: { [key: string]: { size: number; color: string } } = {};
    const repoNodes = userData.repositories?.nodes || [];
    
    for (const repo of repoNodes) {
      const edges = repo.languages?.edges || [];
      for (const edge of edges) {
        const langName = edge.node?.name;
        const langColor = edge.node?.color || "#cccccc";
        const size = edge.size || 0;
        
        if (langName) {
          if (!langSizes[langName]) {
            langSizes[langName] = { size: 0, color: langColor };
          }
          langSizes[langName].size += size;
        }
      }
    }

    // Sort languages by size
    const sortedLanguages = Object.entries(langSizes)
      .map(([name, info]) => ({ name, color: info.color, size: info.size }))
      .sort((a, b) => b.size - a.size);

    const totalLangSize = sortedLanguages.reduce((sum, item) => sum + item.size, 0);
    
    const topLanguages = sortedLanguages.slice(0, 2).map(lang => ({
      name: lang.name,
      color: lang.color,
      percentage: totalLangSize > 0 ? Math.round((lang.size / totalLangSize) * 100) : 50
    }));

    // If less than 2 languages, pad it
    if (topLanguages.length === 1) {
      topLanguages.push({ name: "Other", color: "#888888", percentage: 100 - topLanguages[0].percentage });
    } else if (topLanguages.length === 0) {
      topLanguages.push({ name: "Markdown", color: "#888888", percentage: 100 });
    }

    // Extract last 30 days contribution days
    const calendarWeeks = contribs.contributionCalendar?.weeks || [];
    const flatDays = calendarWeeks.flatMap((w: any) => w.contributionDays || []);
    const last30Days = flatDays.slice(-30);

    // Calculate max consecutive contribution streak in the last 30 days
    let currentStreak = 0;
    let maxStreak = 0;
    for (const day of last30Days) {
      const count = day.contributionCount || 0;
      if (count > 0) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    // Create formatted receipt date
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: "numeric", 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit",
      hour12: false
    };
    const dateFormatted = now.toLocaleDateString("en-US", options);
    
    // Hash username into unique hex string
    const userHashStr = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const orderHash = Math.abs(userHashStr).toString(16).toUpperCase().padStart(4, "0");
    const orderNumber = `DEV-${orderHash}-${now.getMonth() + 1}${now.getDate()}`;

    const receiptData = {
      username: userData.login,
      name: profileName,
      avatarUrl: avatarUrl,
      bio: bio,
      createdAt: createdAt,
      followers: followers,
      following: following,
      totalCommits: commits,
      totalPRs: prs,
      totalIssues: issues,
      totalReviews: reviews,
      totalContributions: totalContributions,
      codingHours: codingHours,
      energyLevel: energyLevel,
      energyLevelLabel: energyLevelLabel,
      topLanguages: topLanguages,
      streak: maxStreak,
      contributionHistory: last30Days,
      orderNumber: orderNumber,
      date: dateFormatted,
      simulated: false
    };

    cache.set(username.toLowerCase(), { data: receiptData, timestamp: Date.now() });
    return res.json(receiptData);

  } catch (error: any) {
    console.error(`[Devciptify] Server error processing request for ${username}:`, error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Start Express server and bundle Vite dev/production middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Devciptify] Express server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
