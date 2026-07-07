import {
  BarChart3,
  Database,
  FileText,
  Layers,
  Orbit,
  Presentation,
  RefreshCcw,
  Scale,
  Zap,
} from "lucide-react";

export const PAGE_METADATA = {
  intro: {
    title: "项目介绍",
    description: "了解 TradePilot AI 的定位、使用场景与核心价值。",
  },
  operate: {
    title: "开始判断",
    description: "输入商品信息，生成进货前的利润、风险与测款建议。",
  },
  result: {
    title: "进货报告",
    description: "查看当前商品的综合评分、利润测算、风险判断和行动建议。",
  },
  "content-pattern": {
    title: "内容结构库",
    description: "沉淀小红书图文内容结构，生成可发布的原创种草文案包。",
  },
  history: {
    title: "我的产品库",
    description: "保存候选商品，持续跟踪进货判断与测款结果。",
  },
  pk: {
    title: "候选产品PK",
    description: "对比多个候选商品，辅助选择更值得拿样的方向。",
  },
  review: {
    title: "测款复盘",
    description: "记录发布后的内容表现，沉淀真实测款反馈。",
  },
  demo: {
    title: "评委演示",
    description: "快速展示产品闭环、功能亮点与项目价值。",
  },
};

const NAVIGATION_GROUPS = [
  {
    label: "产品流程",
    items: [
      { mode: "operate", label: "开始判断", icon: Zap },
      { mode: "result", label: "进货报告", icon: BarChart3 },
      { mode: "content-pattern", label: "内容结构库", icon: Layers },
      { mode: "history", label: "我的产品库", icon: Database },
      { mode: "pk", label: "候选产品PK", icon: Scale },
      { mode: "review", label: "测款复盘", icon: RefreshCcw },
    ],
  },
  {
    label: "展示说明",
    items: [
      { mode: "intro", label: "项目介绍", icon: FileText },
      { mode: "demo", label: "评委演示", icon: Presentation },
    ],
  },
];

function NavigationItem({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`group relative flex h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border px-3.5 text-left text-sm font-semibold transition duration-200 lg:w-full ${
        active
          ? "border-[#5fe1c3]/20 bg-[#102620] text-white shadow-[0_8px_28px_rgba(24,119,101,0.12)]"
          : "border-transparent bg-transparent text-[#a7b5b2] hover:border-[#5fe1c3]/15 hover:bg-[#5fe1c3]/[0.06] hover:text-[#f4f7f7]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#5fe1c3] transition-opacity duration-200 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icon
        aria-hidden="true"
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
          active ? "text-[#5fe1c3]" : "text-[#718b85] group-hover:text-[#85cbbb]"
        }`}
        strokeWidth={1.8}
      />
      <span>{label}</span>
    </button>
  );
}

export default function SidebarNavigation({ activeMode, onNavigate, onBrandClick }) {
  return (
    <aside className="sticky top-0 z-30 flex w-full flex-col border-b border-[#5fe1c3]/10 bg-[#071412]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-5 lg:pb-5 lg:pt-6">
        <button type="button" onClick={onBrandClick} className="group flex min-w-0 items-center gap-3 text-left">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5fe1c3]/20 bg-[#5fe1c3]/[0.07] text-[#5fe1c3] shadow-[0_0_24px_rgba(95,225,195,0.08)]">
            <Orbit className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#5fe1c3] shadow-[0_0_8px_rgba(95,225,195,0.65)]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black tracking-tight text-[#f4f7f7]">TradePilot AI</span>
            <span className="block text-xs font-semibold text-[#5fe1c3]">拿货搭子</span>
          </span>
        </button>
        <p className="mt-4 hidden border-b border-[#5fe1c3]/10 pb-5 text-[11px] leading-5 text-[#71807c] lg:block">
          AI进货选品与爆款测款智能体
        </p>
      </div>

      <nav aria-label="主导航" className="sidebar-nav-scroll flex gap-2 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-4 lg:pb-5">
        {NAVIGATION_GROUPS.map((group) => (
          <section key={group.label} className="contents lg:block">
            <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5d716c] lg:block">
              {group.label}
            </p>
            <div className="contents lg:block lg:space-y-1">
              {group.items.map((item) => (
                <NavigationItem
                  key={item.mode}
                  active={activeMode === item.mode}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => onNavigate(item.mode)}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
