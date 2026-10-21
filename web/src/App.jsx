import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Bell, BookOpenText, Broadcast, Buildings,
  CaretDown, CaretRight, ChartLineUp, Check, CheckCircle, CircleNotch,
  Clock, Compass, Database, Eye, FileText, Funnel, GearSix, Globe, Heart,
  House, Lightning, Link, MagnifyingGlass, Megaphone, PencilSimple, Pulse,
  RocketLaunch, SlidersHorizontal, Sparkle, Star, Target, TrendUp,
  UserCircle, WarningCircle, X,
} from "@phosphor-icons/react";
import {
  channelDirectory, flowStages, hotTopics, initialKeywords, pulseGroups,
  reviewRows, sites, sourceSchedules,
} from "./data/demoData.js";

const navItems = [
  { id: "today", label: "今日", icon: House },
  { id: "keywords", label: "词库", icon: Database },
  { id: "hot", label: "热点", icon: Pulse },
  { id: "sites", label: "站点", icon: Buildings },
  { id: "channels", label: "渠道", icon: Megaphone },
  { id: "review", label: "复盘", icon: ChartLineUp },
  { id: "flow", label: "流程", icon: Compass },
];

const decisionOptions = ["待决定", "计划做", "在做", "暂缓", "不做"];

function cx(...names) { return names.filter(Boolean).join(" "); }

function StatusDot({ tone = "yellow" }) {
  return <span className={cx("status-dot", `status-dot--${tone}`)} aria-hidden="true" />;
}

function Chip({ children, tone = "neutral", icon: Icon }) {
  return <span className={cx("chip", `chip--${tone}`)}>{Icon ? <Icon size={13} weight="bold" /> : null}{children}</span>;
}

function Button({ children, variant = "secondary", icon: Icon, className, ...props }) {
  return <button className={cx("button", `button--${variant}`, className)} {...props}>{Icon ? <Icon size={16} weight="bold" /> : null}{children}</button>;
}

function SectionHeading({ title, detail, action }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail ? <p>{detail}</p> : null}</div>{action}</div>;
}

function EmptyLine({ label = "暂无记录" }) { return <div className="empty-line">{label}</div>; }

function MiniBars({ value = 70, tone = "red" }) {
  const heights = [28, 45, 36, 62, 54, 82, Math.max(32, value)];
  return <span className="mini-bars" aria-label={`机会强度 ${value}`}>{heights.map((height, index) => <i key={index} className={`mini-bars__bar mini-bars__bar--${tone}`} style={{ height: `${height}%` }} />)}</span>;
}

function verificationRows(word, providerStatus = []) {
  const trendLabel = word.trend === "rising" ? "持续上涨" : word.trend === "steady" ? "稳定需求" : "新出现，待沉淀";
  const directState = (provider) => providerStatus.find((item) => item.provider === provider)?.credential === "configured" ? "可运行" : "待凭证";
  return [
    { dimension: "趋势", provider: "Google Trends", route: "AIsa / GoAnyAPI", value: `${trendLabel} · ${word.searchGrowth}`, state: "已校验" },
    { dimension: "需求规模", provider: "Google Ads", route: "DataForSEO 经 AIsa", value: `月搜约 ${(word.dailySearch * 30).toLocaleString()}`, state: "已校验" },
    { dimension: "首页竞争", provider: "Google SERP + KD", route: "DataForSEO 经 AIsa", value: word.weakResults === null ? "SERP 待抓取" : `${word.competition} · ${word.weakResults} 个弱结果`, state: word.weakResults === null ? "待补" : "已校验" },
    { dimension: "站点强度", provider: "Domain rating", route: "GoAnyAPI DR", value: word.weakResults === null ? "尚无结果域名" : "逐个评估首页域名", state: word.weakResults === null ? "待补" : "已校验" },
    { dimension: "供给 / 广告", provider: "Intitle + Ads", route: "GoAnyAPI", value: word.revenueSignal === "未知" ? "广告与页面供给待核对" : "检查新增页面与广告主", state: "部分" },
    { dimension: "商业验证", provider: "TrustMRR / 收款链接", route: "AIsa + 公开外链", value: `商业信号：${word.revenueSignal}`, state: word.revenueSignal === "未知" ? "待补" : "已校验" },
    { dimension: "站点访问", provider: "Similarweb", route: "Batch API 适配器已就绪；无凭证时使用 GoAnyAPI traffic 代理", value: "入围词的首页域名按监控轮次异步补全", state: directState("Similarweb") },
    { dimension: "第三方交叉", provider: "Ahrefs", route: "Keywords Explorer v3 · AHREFS_API_KEY", value: "KD / 流量潜力 / 父主题 / 点击", state: directState("Ahrefs") },
    { dimension: "第三方交叉", provider: "Semrush", route: "Keyword Metrics v4 · SEMRUSH_API_KEY", value: "意图 / CPC / 付费密度 / KD / SERP", state: directState("Semrush") },
  ];
}

function evidenceCoverage(word) {
  const rows = verificationRows(word);
  return { ready: rows.filter((row) => row.state === "已校验").length, total: rows.length };
}

function Header({ active, onNavigate, onOpenPreferences, onOpenSystem, onRefresh, refreshing, lastRefresh }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("today")}>
        <img src="/logo.svg" alt="Opptune 新词雷达" /><span>Opptune</span>
      </button>
      <nav className="main-nav" aria-label="主导航">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cx("nav-item", active === id && "nav-item--active")} onClick={() => onNavigate(id)}>
            <Icon size={16} weight={active === id ? "fill" : "regular"} /><span>{label}</span>{id === "sites" ? <em>3</em> : null}
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <div className="refresh-meta"><span><i />上次抓取 {lastRefresh}</span><small>页面每分钟更新 · 演示数据</small></div>
        <button className="icon-button text-icon-button" onClick={onOpenPreferences}><UserCircle size={19} /><span>偏好</span></button>
        <button className="icon-button text-icon-button" onClick={onOpenSystem}><GearSix size={18} /><span>系统</span><b>4</b></button>
        <Button icon={refreshing ? CircleNotch : ArrowClockwise} onClick={onRefresh} className={refreshing ? "is-loading" : ""}>{refreshing ? "抓取中" : "立即抓取"}</Button>
      </div>
    </header>
  );
}

function TodayPage({ keywords, onOpenKeyword, onDecision, onNavigate }) {
  const featured = keywords[0];
  const actionCount = keywords.filter((word) => word.systemLabels.includes("建议做")).length + 9;
  const planningCount = keywords.filter((word) => ["计划做", "在做"].includes(word.userDecision)).length;
  return (
    <main className="page page--today">
      <section className="today-hero">
        <div className="date-block"><strong>10.21</strong><span>周三，今天的选品</span></div>
        <div className="hero-recommendation">
          <p className="eyebrow"><Sparkle size={15} weight="fill" /> 今日建议</p>
          <p>最值得先看的是 <b>{featured.name}</b>。先做一个可调用的轻量工具页；品牌热度高、首页尚未完全封闭。</p>
          <button onClick={() => onOpenKeyword(featured.id)}>查看判断依据 <ArrowRight size={14} /></button>
        </div>
        <div className="metric-strip">
          <div><strong className="red">{actionCount}</strong><span>可行动</span></div><div><strong className="orange">18</strong><span>开始扩散</span></div><div><strong>40</strong><span>7 天新上架</span></div><div><strong>{planningCount}</strong><span>计划 / 在做</span></div>
        </div>
      </section>
      <section className="alert-row"><WarningCircle size={18} weight="fill" /><span><b>4 个来源这轮没抓全</b>（官方博客、Know Your Meme、Sitemap、新域名），结论可能偏弱。</span><button>看原因</button></section>
      <section className="evidence-gate" aria-label="行动证据门槛">
        <div className="evidence-gate__intro"><span>行动门槛</span><b>热度只负责发现，必须再过 5 组证据</b></div>
        <div className="evidence-gate__item is-info"><Pulse size={17} /><span><b>发现</b><small>社媒 / 新发布</small></span><em>入口</em></div>
        <div className="evidence-gate__item is-pass"><CheckCircle size={17} /><span><b>需求</b><small>Trends + Ads</small></span><em>通过</em></div>
        <div className="evidence-gate__item is-pass"><CheckCircle size={17} /><span><b>竞争</b><small>SERP + KD</small></span><em>通过</em></div>
        <div className="evidence-gate__item is-partial"><WarningCircle size={17} /><span><b>站点强度</b><small>DR + Traffic</small></span><em>部分</em></div>
        <div className="evidence-gate__item is-pass"><CheckCircle size={17} /><span><b>商业</b><small>Ads + 收款</small></span><em>通过</em></div>
        <div className="evidence-gate__item is-pass"><CheckCircle size={17} /><span><b>个人匹配</b><small>预算 / 速度</small></span><em>通过</em></div>
      </section>
      <section className="pulse-section">
        <SectionHeading title="过去 24 小时冒出的词" detail="色点是热度：红色可以行动，橙色开始扩散，黄色刚发现。大厂名只在发布版本号时出现。" action={<Button variant="ghost" icon={Eye} onClick={() => onNavigate("keywords")}>看全部 163 个</Button>} />
        <div className="pulse-grid">
          {pulseGroups.map((group) => (
            <div className="pulse-column" key={group.label}>
              <div className="pulse-column__title"><span>{group.label}</span><b>{group.count}</b></div>
              <div className="pulse-list">
                {group.items.map((item) => (
                  <button key={item.name} onClick={() => { const hit = keywords.find((word) => word.name.toLowerCase() === item.name.toLowerCase()); if (hit) onOpenKeyword(hit.id); }}>
                    <StatusDot tone={item.tone} /><span><b>{item.name}</b><small>{item.state}</small></span>
                  </button>
                ))}
              </div>
              {group.count > group.items.length ? <button className="more-link" onClick={() => onNavigate("keywords")}>还有 {group.count - group.items.length} 个</button> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="today-grid">
        <div className="recommendation-list">
          <SectionHeading title="先看这几个" detail="按你当前偏好排序：新手、尽快获得真实用户、工具站优先、低成本验证。" action={<button className="text-link" onClick={() => onNavigate("keywords")}>全部信号词 <ArrowRight size={14} /></button>} />
          {keywords.slice(0, 4).map((word) => <KeywordCard key={word.id} word={word} onOpen={() => onOpenKeyword(word.id)} onDecision={onDecision} />)}
        </div>
        <aside className="hot-list">
          <SectionHeading title="热点前 5" action={<button className="text-link" onClick={() => onNavigate("hot")}>全部热点</button>} />
          {hotTopics.map((topic) => (
            <article key={topic.rank}><strong>{topic.rank}</strong><div><h3>{topic.title}</h3><div className="topic-meter"><span style={{ width: `${Math.max(26, 100 - topic.rank * 13)}%` }} /></div><p>{topic.sources} 个来源　{topic.time}</p><div>{topic.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div></div></article>
          ))}
        </aside>
      </section>
    </main>
  );
}

function KeywordCard({ word, onOpen, onDecision }) {
  const primaryTone = word.systemLabels.includes("高净值") ? "gold" : word.score >= 85 ? "red" : "orange";
  const coverage = evidenceCoverage(word);
  return (
    <article className="keyword-card" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}>
      <div className="keyword-card__header">
        <div><h3>{word.name} <small>{word.alias}</small></h3><div className="keyword-card__labels"><Chip tone={word.type === "高价值老词" ? "gold" : word.type === "需求词" ? "blue" : "red"}>{word.type}</Chip><Chip>{word.format}</Chip>{word.systemLabels.slice(0, 2).map((label) => <Chip key={label} tone={label === "高净值" ? "gold" : "green"}>{label}</Chip>)}</div></div>
        <div className="card-actions" onClick={(event) => event.stopPropagation()}><Button variant="compact" icon={Star}>关注</Button><Button variant="compact" icon={PencilSimple} onClick={() => onDecision(word.id, "在做")}>在做</Button><Button variant="compact" icon={X} onClick={() => onDecision(word.id, "不做")}>忽略</Button></div>
      </div>
      <p className="keyword-card__summary">{word.summary}</p><p className="keyword-card__evidence">{word.evidence[0].note} <span>（{word.evidence[0].source}，{word.evidence[0].time}）</span></p>
      <div className="keyword-card__footer"><MiniBars value={word.score} tone={primaryTone === "gold" ? "orange" : primaryTone} /><b className={cx("actionable-label", `actionable-label--${primaryTone}`)}>{word.systemLabels[0]}</b><span>证据 {coverage.ready}/{coverage.total}</span><span>估算日搜 {word.dailySearch.toLocaleString()}</span><span>首页竞争 {word.competition}</span><span>{word.linkedSites.length ? `已关联 ${word.linkedSites[0]}` : "尚未建站"}</span><em className="decision-pill">你的决定：{word.userDecision}</em></div>
    </article>
  );
}

function KeywordsPage({ keywords, onOpenKeyword, onDecision }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("全部"); const [sort, setSort] = useState("综合机会");
  const filters = ["全部", "新词", "热词", "需求词", "高价值老词", "高净值", "我在做"];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...keywords].filter((word) => {
      const matchesQuery = !normalized || `${word.name} ${word.alias} ${word.format}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === "全部" || word.type === filter || (filter === "高净值" && word.systemLabels.includes("高净值")) || (filter === "我在做" && ["计划做", "在做"].includes(word.userDecision));
      return matchesQuery && matchesFilter;
    }).sort((a, b) => sort === "日搜索量" ? b.dailySearch - a.dailySearch : sort === "最新发现" ? a.age.localeCompare(b.age) : b.score - a.score);
  }, [keywords, query, filter, sort]);
  return (
    <main className="page">
      <PageIntro eyebrow="机会库" title="把雷达信号变成可管理的决策" detail="系统判断和你的决定分开保存。今天不做的词不会消失，站点上线后也能继续追踪覆盖和结果。" />
      <section className="toolbar-panel"><label className="search-box"><MagnifyingGlass size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索关键词、场景或站点" /></label><div className="segment-control">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="select-control"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option>综合机会</option><option>日搜索量</option><option>最新发现</option></select></label></section>
      <section className="table-card"><div className="table-summary"><b>{filtered.length} 个词</b><span>其中 {filtered.filter((word) => word.systemLabels.includes("高净值")).length} 个高净值，{filtered.filter((word) => word.userDecision === "在做").length} 个正在做</span></div>
        <div className="data-table data-table--keywords"><div className="table-row table-row--head"><span>关键词</span><span>系统判断</span><span>需求</span><span>竞争</span><span>你的决定</span><span>覆盖</span><span /></div>
          {filtered.map((word) => (
            <div className="table-row" key={word.id} onClick={() => onOpenKeyword(word.id)}>
              <div className="word-cell"><b>{word.name}</b><small>{word.type} · {word.format} · {word.age}</small></div><div><b className="score-badge">{word.score}</b><small>{word.systemLabels.slice(0, 2).join(" · ")}</small></div><div><b>{word.dailySearch.toLocaleString()} / 日</b><small className="positive">{word.searchGrowth}</small></div><div><b>{word.competition}</b><small>{word.weakResults === null ? "待抓取" : `${word.weakResults} 个弱结果`}</small></div>
              <div onClick={(event) => event.stopPropagation()}><select className="inline-select" value={word.userDecision} onChange={(e) => onDecision(word.id, e.target.value)}>{decisionOptions.map((option) => <option key={option}>{option}</option>)}</select></div><div><b>{word.coverage}</b><small>{word.linkedSites.join(", ") || "—"}</small></div><button className="row-open" aria-label={`打开 ${word.name}`}><CaretRight size={18} /></button>
            </div>
          ))}
        </div>{!filtered.length ? <EmptyLine label="没有符合条件的词" /> : null}
      </section>
    </main>
  );
}

function HotPage({ keywords, onOpenKeyword }) {
  return (
    <main className="page">
      <PageIntro eyebrow="实时热点" title="热度不是结论，跨来源共振才值得行动" detail="把新闻事件聚成主题，再关联可做的名字词、需求词和现有站点。" />
      <section className="hot-overview"><div className="metric-card"><Broadcast size={20} /><span>24 小时主题</span><strong>31</strong><small>较昨日 +8</small></div><div className="metric-card"><Lightning size={20} /><span>三源共振</span><strong>12</strong><small>需要优先阅读</small></div><div className="metric-card"><Target size={20} /><span>可转成工具</span><strong>7</strong><small>包含 3 个低竞争词</small></div><div className="metric-card"><Clock size={20} /><span>平均领先</span><strong>6.4 天</strong><small>相对关键词工具</small></div></section>
      <section className="hot-feed"><SectionHeading title="主题聚类" detail="同一事件的报道、仓库、模型入口和社区讨论被折叠在一起。" />
        {hotTopics.map((topic, index) => { const linked = keywords[index % keywords.length]; return (
          <article className="hot-story" key={topic.rank}><div className="hot-story__rank">{String(topic.rank).padStart(2, "0")}</div><div className="hot-story__main"><div className="hot-story__meta"><Chip tone={topic.rank <= 2 ? "red" : "orange"}>{topic.rank <= 2 ? "加速" : "扩散"}</Chip><span>{topic.time}</span><span>{topic.sources} 个来源</span></div><h2>{topic.title}</h2><p>来源间的时间差正在缩短。系统已将主题关联到 <button onClick={() => onOpenKeyword(linked.id)}>{linked.name}</button>，建议先核对用户意图，再决定是否跟进。</p><div className="source-line"><span>官方发布</span><ArrowRight size={14} /><span>开发者社区</span><ArrowRight size={14} /><span>目录与接口</span></div></div><div className="hot-story__spark">{[28, 36, 31, 44, 57, 64, 82, 74, 94].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div></article>
        ); })}
      </section>
    </main>
  );
}

function SitesPage({ onNavigate }) {
  const [selected, setSelected] = useState(sites[0].domain); const current = sites.find((site) => site.domain === selected);
  return (
    <main className="page"><PageIntro eyebrow="站点组合" title="统一管理你做过、在做和暂缓的站点" detail="这里记录决策、词覆盖和真实结果；具体建站与部署在外部完成。" action={<Button icon={Buildings}>登记站点</Button>} />
      <section className="portfolio-summary"><div><span>已登记站点</span><strong>4</strong><small>1 个在线</small></div><div><span>覆盖关键词</span><strong>76</strong><small>12 个值得补页</small></div><div><span>30 天自然点击</span><strong>245</strong><small className="positive">+31%</small></div><div><span>真实付费用户</span><strong>2</strong><small>来自 1 个站点</small></div></section>
      <section className="sites-layout"><div className="site-list">{sites.map((site) => <button key={site.domain} className={cx("site-list-item", selected === site.domain && "site-list-item--active")} onClick={() => setSelected(site.domain)}><div className="site-icon"><Globe size={19} /></div><div><b>{site.domain}</b><small>{site.focus}</small></div><div className="site-list-item__status"><Chip tone={site.status === "在线" ? "green" : site.status === "暂停" ? "red" : "blue"}>{site.status}</Chip><span>{site.stage}</span></div><CaretRight size={17} /></button>)}</div>
        <div className="site-detail"><div className="site-detail__top"><div><p className="eyebrow">当前站点</p><h2>{current.domain}</h2><p>{current.focus} · {current.stage}</p></div><div className="health-score"><span>组合健康度</span><strong>{current.health}</strong><small>/ 100</small></div></div><div className="site-kpis"><div><span>关联词</span><b>{current.keywords}</b></div><div><span>上线页面</span><b>{current.livePages}</b></div><div><span>30 天点击</span><b>{current.clicks30d}</b></div><div><span>付费用户</span><b>{current.paidUsers}</b></div><div><span>收入</span><b>{current.revenue}</b></div></div><div className="site-next-action"><Target size={22} weight="fill" /><div><span>下一步最重要</span><b>{current.next}</b></div></div>
          <div className="coverage-board"><div className="coverage-board__header"><h3>词到页面的覆盖</h3><button onClick={() => onNavigate("keywords")}>查看全部词</button></div><div className="coverage-row"><span>核心需求页</span><div><i style={{ width: `${Math.min(100, current.livePages * 13)}%` }} /></div><b>{current.livePages} / 8</b></div><div className="coverage-row"><span>对比与替代页</span><div><i style={{ width: `${Math.min(100, current.livePages * 8)}%` }} /></div><b>{Math.floor(current.livePages / 2)} / 6</b></div><div className="coverage-row"><span>场景长尾页</span><div><i style={{ width: `${Math.min(100, current.livePages * 5)}%` }} /></div><b>{Math.max(0, current.livePages - 2)} / 12</b></div></div><div className="boundary-note"><RocketLaunch size={19} /><div><b>建站在本产品之外完成</b><span>系统输出需求、词组、验证指标和下一动作；站点上线后回填 URL 与页面状态。</span></div></div>
        </div>
      </section>
    </main>
  );
}

function ChannelsPage({ keywords }) {
  const [activeWord, setActiveWord] = useState(keywords[0].id); const word = keywords.find((item) => item.id === activeWord);
  return (
    <main className="page"><PageIntro eyebrow="渠道资产" title="每个词都要知道去哪里发、说什么" detail="把外链候选和社媒内容方向做成可复用资产，同时记录验证、提交、发布与失效。" />
      <section className="channel-planner"><div className="channel-word-picker"><span>为哪个词规划渠道</span><select value={activeWord} onChange={(e) => setActiveWord(e.target.value)}>{keywords.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="channel-brief"><div><p className="eyebrow">内容主线</p><h2>{word.name}</h2><p>{word.recommendation}</p></div><div className="channel-goal"><span>首要目标</span><b>{word.userDecision === "在做" ? "找到 10 位试用者" : "验证点击与报名"}</b><small>不要用曝光量代替用户结果</small></div></div><div className="planned-channels">{word.channels.map((channel, index) => <article key={channel.name}><span className="channel-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{channel.name}</h3><p>{channel.angle}</p></div><Chip tone={channel.state === "可尝试" ? "green" : channel.state === "需验证" ? "orange" : "neutral"}>{channel.state}</Chip><Button variant="compact" icon={FileText}>建内容卡</Button></article>)}</div></section>
      <section className="directory-section"><SectionHeading title="渠道目录" detail="长期维护渠道规则、适合的产品类型和历史结果。" action={<Button variant="ghost" icon={Funnel}>筛选</Button>} /><div className="channel-grid">{channelDirectory.map((channel) => <article key={channel.name} className="channel-card"><div className="channel-card__top"><div className="channel-symbol"><Link size={20} /></div><Chip tone={channel.state === "已验证" ? "green" : channel.state === "需验证" ? "orange" : "neutral"}>{channel.state}</Chip></div><h3>{channel.name}</h3><p>{channel.kind} · 权重 {channel.authority} · 反馈 {channel.speed}</p><dl><div><dt>适合</dt><dd>{channel.suitable}</dd></div><div><dt>规则</dt><dd>{channel.rules}</dd></div></dl></article>)}</div></section>
    </main>
  );
}

function ReviewPage() {
  return (
    <main className="page"><PageIntro eyebrow="结果复盘" title="判断不是一次性的，要用真实结果校准" detail="区分趋势命中、流量命中和付费命中；记录做了什么、为什么有效、下一次怎么改。" />
      <section className="review-dashboard"><div className="review-chart-card"><div className="review-chart-card__head"><div><h2>最近 8 周推荐命中率</h2><p>以 14 天后趋势和你的实际结果复核</p></div><Chip tone="green" icon={TrendUp}>+9.4%</Chip></div><div className="bar-chart">{[44, 51, 49, 58, 62, 67, 65, 73].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>W{index + 35}</span></div>)}</div></div><div className="review-score-stack"><div><span>趋势命中</span><strong>73%</strong><small>11 / 15</small></div><div><span>进入首页</span><strong>42%</strong><small>5 / 12</small></div><div><span>获得真实用户</span><strong>25%</strong><small>3 / 12</small></div><div><span>获得付费</span><strong>8%</strong><small>1 / 12</small></div></div></section>
      <section className="table-card review-table-card"><SectionHeading title="逐词复盘" detail="把“没做”也当成决策结果，避免只复盘成功案例。" /><div className="data-table data-table--review"><div className="table-row table-row--head"><span>关键词</span><span>当时决定</span><span>结果</span><span>领先</span><span>真实结果</span><span>本次学习</span></div>{reviewRows.map((row) => <div className="table-row" key={row.keyword}><b>{row.keyword}</b><span>{row.decision}</span><span><Chip tone={row.result === "命中" ? "green" : row.result === "错过" ? "red" : "orange"}>{row.result}</Chip></span><span>{row.leadDays ? `${row.leadDays} 天` : "—"}</span><span>{row.outcome}</span><span>{row.lesson}</span></div>)}</div></section>
    </main>
  );
}

function FlowPage() {
  const [mode, setMode] = useState("product"); const [selected, setSelected] = useState(flowStages[0].id); const stage = flowStages.find((item) => item.id === selected);
  return (
    <main className="page page--flow"><PageIntro eyebrow="全链路蓝图" title="从一个信号，到一个真实付费用户" detail="流程图既是产品导航，也是未来后台任务、数据状态和人工决策的共同语言。" /><section className="flow-switch"><button className={mode === "product" ? "active" : ""} onClick={() => setMode("product")}>产品流程</button><button className={mode === "business" ? "active" : ""} onClick={() => setMode("business")}>业务流程</button></section>
      {mode === "product" ? <><section className="flow-map">{flowStages.map((item, index) => <div className="flow-map__unit" key={item.id}><button className={cx("flow-node", selected === item.id && "flow-node--active", item.external && "flow-node--external")} onClick={() => setSelected(item.id)}><span>{item.step}</span><div><b>{item.title}</b><small>{item.subtitle}</small></div>{item.external ? <Chip>系统外</Chip> : null}</button>{index < flowStages.length - 1 ? <ArrowRight className="flow-arrow" size={20} /> : null}</div>)}</section><section className="flow-detail-card"><div className="flow-detail-card__intro"><span>{stage.step}</span><div><p className="eyebrow">{stage.owner}</p><h2>{stage.title}</h2><p>{stage.subtitle}</p></div></div><div className="flow-detail-grid"><div><h3>输入</h3><ul>{stage.inputs.map((item) => <li key={item}><CheckCircle size={16} />{item}</li>)}</ul></div><div><h3>系统产出</h3><p className="output-box">{stage.output}</p><h3>运行节奏</h3><p>{stage.cadence}</p></div><div><h3>完成标准</h3><p>{stage.id === "decide" ? "你明确下一步与不做的原因" : stage.id === "build" ? "回填可访问 URL 和首个验证事件" : stage.id === "review" ? "形成可作用于下一轮的规则调整" : "状态、证据和下一动作全部可追溯"}</p></div></div></section></> :
        <section className="business-flow"><div className="business-lane"><span>市场层</span><div><b>发现需求变化</b><small>新名字、旧需求、付费产品、用户求助</small></div><ArrowRight /><div><b>找到可切入市场</b><small>规模 × 竞争 × 付费 × 时机</small></div></div><div className="business-lane"><span>决策层</span><div><b>匹配个人条件</b><small>技能、预算、反馈速度、方向偏好</small></div><ArrowRight /><div><b>形成一页机会卡</b><small>做什么、为何现在、如何验证</small></div></div><div className="business-lane business-lane--external"><span>执行层</span><div><b>站外完成建站</b><small>设计、开发、部署、收款</small></div><ArrowRight /><div><b>回填站点与页面</b><small>URL、覆盖词、上线状态</small></div></div><div className="business-lane"><span>增长层</span><div><b>分发与获取用户</b><small>外链候选、社媒角度、发布记录</small></div><ArrowRight /><div><b>记录真实结果</b><small>点击、注册、使用、付费</small></div></div><div className="business-lane"><span>学习层</span><div><b>14 天与周复盘</b><small>命中率、领先天数、失败原因</small></div><ArrowRight /><div><b>更新推荐规则</b><small>让下一轮排序更适合你</small></div></div><div className="business-goal"><Target size={28} weight="fill" /><div><span>唯一北极星结果</span><strong>更快找到并验证愿意付费的真实用户</strong><p>流量、排名和社媒曝光是过程指标；付费与留存才决定词的真实价值。</p></div></div></section>}
    </main>
  );
}

function PageIntro({ eyebrow, title, detail, action }) { return <section className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div>{action}</section>; }

function KeywordDrawer({ word, providerStatus, onClose, onDecision, onNavigate }) {
  const [tab, setTab] = useState("判断"); if (!word) return null;
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={`${word.name} 机会详情`}><button className="drawer-backdrop" onClick={onClose} aria-label="关闭" /><aside className="drawer">
      <div className="drawer__header"><div><div className="drawer__chips"><Chip tone={word.type === "高价值老词" ? "gold" : "red"}>{word.type}</Chip><Chip>{word.format}</Chip></div><h2>{word.name}</h2><p>{word.alias} · {word.age}</p></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div>
      <div className="drawer__score"><div><span>机会分</span><strong>{word.score}</strong></div><div><span>估算日搜</span><strong>{word.dailySearch.toLocaleString()}</strong><small>{word.searchGrowth}</small></div><div><span>首页竞争</span><strong>{word.competition}</strong><small>{word.weakResults === null ? "待抓取" : `${word.weakResults} 个弱结果`}</small></div><div><span>商业信号</span><strong>{word.revenueSignal}</strong></div></div>
      <nav className="drawer-tabs">{["判断", "校验", "证据", "站点", "渠道"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav><div className="drawer__body">{tab === "判断" ? <JudgementPanel word={word} /> : null}{tab === "校验" ? <VerificationPanel word={word} providerStatus={providerStatus} /> : null}{tab === "证据" ? <EvidencePanel word={word} /> : null}{tab === "站点" ? <SitePanel word={word} onNavigate={onNavigate} /> : null}{tab === "渠道" ? <ChannelPanel word={word} onNavigate={onNavigate} /> : null}</div>
      <div className="drawer__footer"><div><span>你的决定</span><select value={word.userDecision} onChange={(e) => onDecision(word.id, e.target.value)}>{decisionOptions.map((item) => <option key={item}>{item}</option>)}</select></div><Button variant="primary" icon={Check} onClick={() => onDecision(word.id, word.userDecision === "在做" ? "计划做" : "在做")}>{word.userDecision === "在做" ? "改为计划做" : "标记为在做"}</Button></div>
    </aside></div>
  );
}

function JudgementPanel({ word }) { return <div className="drawer-panel"><section><p className="panel-label">系统结论</p><div className="system-labels">{word.systemLabels.map((label) => <Chip key={label} tone={label === "高净值" ? "gold" : "green"} icon={label === "高净值" ? Heart : CheckCircle}>{label}</Chip>)}</div><p className="lead-copy">{word.summary}</p><p className="score-note"><CheckCircle size={15} />结论由需求、竞争、商业、可执行性和个人匹配共同生成；热度只表示检查时机。</p></section><section><p className="panel-label">为什么现在</p><ol className="reason-list">{word.whyNow.map((reason, index) => <li key={reason}><span>{index + 1}</span><p>{reason}</p></li>)}</ol></section><section><p className="panel-label">建议做法</p><div className="recommendation-box"><Sparkle size={20} weight="fill" /><p>{word.recommendation}</p></div></section><section><p className="panel-label">下一动作</p><div className="next-action-box"><Target size={20} /><p>{word.nextAction}</p></div></section></div>; }

function VerificationPanel({ word, providerStatus }) {
  const rows = verificationRows(word, providerStatus); const coverage = evidenceCoverage(word);
  const readyProviders = providerStatus.filter((item) => item.credential === "configured").map((item) => item.provider);
  return <div className="drawer-panel verification-panel"><section><div className="verification-summary"><div><span>可用证据</span><strong>{coverage.ready}/{coverage.total}</strong></div><p>热度只触发检查，不直接产生“建议做”。需求、竞争与商业证据必须全部通过；直连供应商用于提高置信度和发现冲突。</p></div></section><section><p className="panel-label">多源交叉校验</p><div className="verification-table">{rows.map((row, index) => <article key={`${row.provider}-${index}`}><div><b>{row.dimension}</b><small>{row.provider}</small></div><div><span>{row.value}</span><small>{row.route}</small></div><Chip tone={row.state === "已校验" ? "green" : row.state === "可运行" ? "blue" : row.state === "部分" || row.state === "代理" || row.state === "待凭证" ? "orange" : "neutral"}>{row.state}</Chip></article>)}</div></section><section className="evidence-warning"><WarningCircle size={20} /><p>直连适配器已经完成。{readyProviders.length ? `${readyProviders.join("、")} 已具备本机凭证，可在下一轮真实监控中运行。` : "当前机器没有三家付费 API 凭证，因此准确显示“待凭证”。"}凭证只从本机环境变量读取，不进入前端或仓库。</p></section></div>;
}

function EvidencePanel({ word }) { return <div className="drawer-panel"><section><p className="panel-label">证据时间线</p><div className="evidence-list">{word.evidence.map((item, index) => <article key={`${item.source}-${index}`}><span><StatusDot tone={index === 0 ? "red" : "orange"} /></span><div><b>{item.source}</b><p>{item.note}</p><small>{item.time}</small></div></article>)}</div></section><section className="evidence-warning"><WarningCircle size={20} /><p>当前内容为可交互框架的演示数据。接入 `radar/store.py` 与运行结果后，证据将由真实来源和抓取时间填充。</p></section></div>; }

function SitePanel({ word, onNavigate }) { return <div className="drawer-panel"><section><p className="panel-label">页面覆盖</p><div className="coverage-summary"><div><span>状态</span><b>{word.coverage}</b></div><div><span>关联站点</span><b>{word.linkedSites.join(", ") || "尚未关联"}</b></div></div></section><section><p className="panel-label">建议页面组合</p><div className="page-plan"><article><FileText size={18} /><div><b>核心工具 / 需求页</b><p>直接回答主意图，提供首个成功时刻。</p></div><Chip tone="green">优先</Chip></article><article><BookOpenText size={18} /><div><b>用法与对比页</b><p>承接品牌和工作流长尾，解释差异与限制。</p></div><Chip>随后</Chip></article></div></section><div className="boundary-note"><RocketLaunch size={19} /><div><b>建站执行不在本产品内</b><span>这里只管理需求、状态、URL 与结果。</span></div></div><Button onClick={() => onNavigate("sites")} icon={Buildings}>打开站点组合</Button></div>; }

function ChannelPanel({ word, onNavigate }) { return <div className="drawer-panel"><section><p className="panel-label">推荐渠道与内容方向</p><div className="drawer-channel-list">{word.channels.map((channel) => <article key={channel.name}><div><b>{channel.name}</b><p>{channel.angle}</p></div><Chip tone={channel.state === "可尝试" ? "green" : channel.state === "需验证" ? "orange" : "neutral"}>{channel.state}</Chip></article>)}</div></section><Button onClick={() => onNavigate("channels")} icon={Megaphone}>打开渠道资产</Button></div>; }

function PreferencesModal({ onClose, onSave }) {
  const [scope, setScope] = useState("direction"); const [directions, setDirections] = useState(["工具站", "SEO", "快速验证"]); const toggle = (item) => setDirections((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  return <Modal title="个人偏好" subtitle="它只影响排序与建议，不改变原始市场信号。" onClose={onClose}><div className="form-section"><label>当前模式</label><div className="radio-cards"><button className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}><Globe size={20} /><b>全局探索</b><span>不限制方向，寻找最快正反馈</span></button><button className={scope === "direction" ? "active" : ""} onClick={() => setScope("direction")}><Target size={20} /><b>方向聚焦</b><span>本阶段优先匹配选定方向</span></button></div></div><div className="form-section"><label>当前倾向</label><div className="choice-chips">{["工具站", "SEO", "快速验证", "内容站", "开发者工具", "教育产品", "订阅制"].map((item) => <button key={item} className={directions.includes(item) ? "active" : ""} onClick={() => toggle(item)}>{directions.includes(item) ? <Check size={14} /> : null}{item}</button>)}</div></div><div className="two-column-fields"><label>每周可投入<select defaultValue="10-15 小时"><option>5 小时以内</option><option>10-15 小时</option><option>20 小时以上</option></select></label><label>月工具预算<select defaultValue="$100 以内"><option>$30 以内</option><option>$100 以内</option><option>$300 以内</option></select></label></div><div className="form-section"><label>核心目标</label><textarea defaultValue="新手期，优先尽快获得正反馈和真实付费用户；市场不限，倾向工具站和 SEO，但由证据决定。" /></div><div className="modal-actions"><Button onClick={onClose}>取消</Button><Button variant="primary" icon={Check} onClick={() => onSave({ scope, directions })}>保存偏好</Button></div></Modal>;
}

function SystemModal({ providerStatus, onClose, onSave }) {
  const [advanced, setAdvanced] = useState(false);
  const coreProviders = [
    ["DataForSEO · AIsa", "Trends / Ads / SERP / KD", "适配器就绪", "green"],
    ["GoAnyAPI", "DR / Intitle / Ads / Traffic", "适配器就绪", "green"],
    ["TrustMRR / 收款链接", "收入与付费证据", "适配器就绪", "green"],
  ];
  const directStatus = providerStatus.length ? providerStatus : [
    { provider: "Ahrefs", capabilities: "KD / 流量潜力 / 父主题", credential: "missing" },
    { provider: "Semrush", capabilities: "意图 / CPC / 付费密度", credential: "missing" },
    { provider: "Similarweb", capabilities: "Batch API · 首页域名流量", credential: "missing" },
  ];
  const directProviders = directStatus.map((item) => [item.provider, item.capabilities, item.credential === "configured" ? "可运行" : "待凭证", item.credential === "configured" ? "green" : "orange"]);
  const providers = [...coreProviders, ...directProviders];
  return <Modal title="系统与推理设置" subtitle="采集频率、数据源、成本上限和模型分工可以独立调整。" onClose={onClose} wide><div className="model-policy"><div><Sparkle size={22} weight="fill" /><div><span>深度机会判断</span><b>GPT-6 Astra · XHigh</b><small>只在多源证据齐全或人工要求时触发</small></div><Chip tone="gold">最强推理</Chip></div><div><Lightning size={22} /><div><span>日常分类与摘要</span><b>GPT-6.1 Sol · High</b><small>用于重复任务，控制延迟与成本</small></div><Chip tone="blue">默认</Chip></div></div><section className="provider-inventory"><div className="schedule-head"><div><h3>关键词校验数据源</h3><p>状态来自当前 GitHub 仓库代码，不把代理数据标成官方直连。</p></div></div><div>{providers.map(([name, use, state, tone]) => <article key={name}><span><b>{name}</b><small>{use}</small></span><Chip tone={tone}>{state}</Chip></article>)}</div></section><div className="schedule-head"><div><h3>刷新计划</h3><p>频率指后台采集；页面默认每分钟读取一次最新状态。</p></div><button className="text-link" onClick={() => setAdvanced(!advanced)}>{advanced ? "收起高级项" : "显示高级项"}<CaretDown size={14} /></button></div><div className="schedule-table">{sourceSchedules.filter((_, index) => advanced || index < 6).map((item) => <div key={item.source}><span><b>{item.source}</b><small>{item.kind} · {item.mode}</small></span><select defaultValue={item.frequency}><option>2 分钟</option><option>5 分钟</option><option>15 分钟</option><option>1 小时</option><option>6 小时</option><option>每天</option><option>每周</option><option>到期任务</option></select><button className="toggle active" aria-label={`${item.source} 启用`}><i /></button></div>)}</div><div className="cost-guard"><Bell size={19} /><div><b>成本保护</b><span>预计超过每日 $3 或单次深度判断超过 30 个词时，暂停并进入审核队列。</span></div><button className="toggle active"><i /></button></div><div className="modal-actions"><Button onClick={onClose}>取消</Button><Button variant="primary" icon={Check} onClick={onSave}>保存设置</Button></div></Modal>;
}

function Modal({ title, subtitle, onClose, wide, children }) { return <div className="modal-layer" role="dialog" aria-modal="true"><button className="modal-backdrop" onClick={onClose} aria-label="关闭" /><section className={cx("modal", wide && "modal--wide")}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header><div className="modal-body">{children}</div></section></div>; }
function Toast({ message }) { if (!message) return null; return <div className="toast"><CheckCircle size={19} weight="fill" />{message}</div>; }

export function App() {
  const [active, setActive] = useState("today"); const [keywords, setKeywords] = useState(initialKeywords); const [providerStatus, setProviderStatus] = useState([]); const [drawerId, setDrawerId] = useState(null); const [preferencesOpen, setPreferencesOpen] = useState(false); const [systemOpen, setSystemOpen] = useState(false); const [refreshing, setRefreshing] = useState(false); const [lastRefresh, setLastRefresh] = useState("2 分钟前"); const [toast, setToast] = useState("");
  useEffect(() => { fetch("/provider-status.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("provider status unavailable"))).then((data) => setProviderStatus(data.providers || [])).catch(() => setProviderStatus([])); }, []);
  const drawerWord = keywords.find((word) => word.id === drawerId);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navigate = (page) => { setActive(page); setDrawerId(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const updateDecision = (id, value) => { setKeywords((current) => current.map((word) => word.id === id ? { ...word, userDecision: value } : word)); notify(`已将决定更新为“${value}”`); };
  const refresh = () => { if (refreshing) return; setRefreshing(true); window.setTimeout(() => { setRefreshing(false); setLastRefresh("刚刚"); notify("抓取任务已完成：发现 6 个新信号，2 个进入审核队列"); }, 1100); };
  return <div className="app-shell"><Header active={active} onNavigate={navigate} onOpenPreferences={() => setPreferencesOpen(true)} onOpenSystem={() => setSystemOpen(true)} onRefresh={refresh} refreshing={refreshing} lastRefresh={lastRefresh} />{active === "today" ? <TodayPage keywords={keywords} onOpenKeyword={setDrawerId} onDecision={updateDecision} onNavigate={navigate} /> : null}{active === "keywords" ? <KeywordsPage keywords={keywords} onOpenKeyword={setDrawerId} onDecision={updateDecision} /> : null}{active === "hot" ? <HotPage keywords={keywords} onOpenKeyword={setDrawerId} /> : null}{active === "sites" ? <SitesPage onNavigate={navigate} /> : null}{active === "channels" ? <ChannelsPage keywords={keywords} /> : null}{active === "review" ? <ReviewPage /> : null}{active === "flow" ? <FlowPage /> : null}<footer className="app-footer"><div><img src="/logo.svg" alt="" /><b>Opptune</b><span>基于 new-term-radar 4fd12da 的长期机会监控框架</span></div><span>当前内容含演示数据 · 2026.10.21</span></footer>{drawerWord ? <KeywordDrawer word={drawerWord} providerStatus={providerStatus} onClose={() => setDrawerId(null)} onDecision={updateDecision} onNavigate={navigate} /> : null}{preferencesOpen ? <PreferencesModal onClose={() => setPreferencesOpen(false)} onSave={() => { setPreferencesOpen(false); notify("个人偏好已保存，排序会在下一轮重算"); }} /> : null}{systemOpen ? <SystemModal providerStatus={providerStatus} onClose={() => setSystemOpen(false)} onSave={() => { setSystemOpen(false); notify("系统设置已保存"); }} /> : null}<Toast message={toast} /></div>;
}

