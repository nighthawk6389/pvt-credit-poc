import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GitBranch,
  Briefcase,
  ShieldAlert,
  Building2,
  Handshake,
  Lock,
  TrendingUp,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Portfolio-wide KPIs, watchlist & covenant calendar" },
  { title: "Pipeline", href: "/pipeline", icon: GitBranch, description: "Sourcing & deal pipeline" },
  { title: "Portfolio", href: "/portfolio", icon: Briefcase, description: "Closed positions & borrower monitoring" },
  { title: "Returns", href: "/returns", icon: TrendingUp, description: "IRR / MOIC analytics across the book" },
  { title: "Covenants", href: "/covenants", icon: ShieldAlert, description: "Cross-portfolio compliance calendar" },
  { title: "Sponsors", href: "/sponsors", icon: Handshake, description: "Sponsor relationship coverage" },
  { title: "Compliance", href: "/compliance", icon: Lock, description: "Wall-crossings & information barriers" },
];

export const DEAL_TABS: { title: string; segment: string; description: string }[] = [
  { title: "Overview", segment: "", description: "Deal summary" },
  { title: "Data Room", segment: "data-room", description: "Files & documents" },
  { title: "Diligence", segment: "diligence", description: "DDQ & call notes" },
  { title: "IC Memo", segment: "memo", description: "Credit memo & vote" },
  { title: "Structuring", segment: "structuring", description: "Terms, sources & uses, Bloomberg analytics" },
  { title: "Covenants", segment: "covenants", description: "Covenant package & tests" },
  { title: "Valuation", segment: "valuation", description: "Fair-value marks & DCF" },
  { title: "Cash Flow", segment: "cashflow", description: "Amortization & drawdowns" },
  { title: "Events", segment: "events", description: "Lifecycle events" },
];

export { Building2 };
