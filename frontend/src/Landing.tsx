import { useEffect, useState } from "react";
import "./Landing.css";

type LandingProps = {
  onStartChat: () => void;
};

const STATS = [
  { value: 12847, suffix: "+", label: "Consults this month" },
  { value: 4.9, suffix: "", label: "Patient rating", decimals: 1 },
  { value: 12, suffix: " min", label: "Avg. response time" }
];

const FEATURES = [
  {
    icon: "⚡",
    title: "3-step smart triage",
    desc: "Answer a few guided questions. Our engine scores severity and recommends the safest next step—in seconds."
  },
  {
    icon: "🏠",
    title: "Home visits & video",
    desc: "Book verified doctors for in-home care or video consults. Filter by specialty, gender, and availability."
  },
  {
    icon: "🛡️",
    title: "Clinical-grade safety",
    desc: "Red-flag detection, consent-first data collection, and emergency escalation built into every flow."
  },
  {
    icon: "💬",
    title: "Familiar chat UX",
    desc: "WhatsApp-style interface your family already knows. No app download—works in any browser."
  }
];

const STEPS = [
  { num: "01", title: "Say hello", desc: "Tell us who needs care and what you need help with today." },
  { num: "02", title: "Share symptoms", desc: "Quick severity check with optional red-flag screening." },
  { num: "03", title: "Get matched", desc: "See best-fit doctors, book a slot, and get a prep checklist." }
];

const TESTIMONIALS = [
  {
    quote: "Booked a home visit for my father at 11 PM. The bot guided us calmly through everything.",
    name: "Priya S.",
    role: "Daughter & caregiver, Bengaluru"
  },
  {
    quote: "Felt like texting a nurse friend—not a cold hospital portal. Triage was spot on.",
    name: "Ravi K.",
    role: "Patient, Hyderabad"
  }
];

function useAnimatedCounter(target: number, decimals = 0, duration = 1800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
}

function StatCard({ value, suffix, label, decimals = 0 }: (typeof STATS)[number]) {
  const display = useAnimatedCounter(value, decimals);
  return (
    <div className="statCard">
      <div className="statValue">
        {display}
        {suffix}
      </div>
      <div className="statLabel">{label}</div>
    </div>
  );
}

export default function Landing({ onStartChat }: LandingProps) {
  const [liveCount, setLiveCount] = useState(342);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((n) => n + Math.floor(Math.random() * 3) - 1);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <div className="landingBg" aria-hidden="true">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="gridPattern" />
      </div>

      <header className="nav">
        <a className="logo" href="#">
          <span className="logoMark">CC</span>
          <span className="logoText">
            CareConnect
            <small>Health</small>
          </span>
        </a>
        <nav className="navLinks" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#trust">Trust</a>
        </nav>
        <div className="navActions">
          <span className="livePill">
            <span className="liveDot" />
            {liveCount} online now
          </span>
          <button className="btnNav" type="button" onClick={onStartChat}>
            Try live demo
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow">
            <span className="badge">Real-time triage</span>
            <span className="badge muted">Home health • India</span>
          </div>
          <h1>
            Healthcare that feels like a <em>conversation</em>—not a waiting room.
          </h1>
          <p className="heroLead">
            CareConnect guides patients from first symptom to booked doctor visit in minutes.
            Smart triage, verified clinicians, and home visits—all in a chat you already know how to use.
          </p>
          <div className="heroCtas">
            <button className="btnPrimary" type="button" onClick={onStartChat}>
              Start free assessment
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <a className="btnGhost" href="#how">
              See how it works
            </a>
          </div>
          <div className="heroStats">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
          <div className="trustRow">
            <span>Trusted by families at</span>
            <div className="trustLogos">
              <span>Apollo</span>
              <span>Max</span>
              <span>Star Health</span>
              <span>Practo</span>
            </div>
          </div>
        </div>

        <div className="heroVisual">
          <div className="previewGlow" aria-hidden="true" />
          <div className="chatPreview" role="img" aria-label="CareConnect chat interface preview">
            <div className="previewChrome">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
              <span className="previewUrl">careconnect.health/chat</span>
            </div>
            <div className="previewBody">
              <div className="previewSidebar">
                <div className="previewBrand">CareConnect</div>
                <div className="previewChat active">
                  <div className="previewAvatar">RK</div>
                  <div>
                    <div className="previewName">Ravi K.</div>
                    <div className="previewSub">Feeling unwell…</div>
                  </div>
                </div>
                <div className="previewChat">
                  <div className="previewAvatar sp">SP</div>
                  <div>
                    <div className="previewName">Sunita P.</div>
                    <div className="previewSub">Medicine refill</div>
                  </div>
                </div>
              </div>
              <div className="previewMain">
                <div className="previewHeader">
                  <div className="previewAvatar bot">CC</div>
                  <div>
                    <div className="previewName">CareConnect Health</div>
                    <div className="previewOnline">✓ Verified • Online</div>
                  </div>
                </div>
                <div className="previewSteps">
                  <span className="done">Greeting</span>
                  <span className="done">Menu</span>
                  <span className="current">Symptoms</span>
                  <span>Assessment</span>
                </div>
                <div className="previewMessages">
                  <div className="previewBubble bot">
                    Namaste. I&apos;m CareConnect—here to help you feel better, safely. Who is this care for?
                  </div>
                  <div className="previewBubble user">Me</div>
                  <div className="previewBubble bot">What would you like help with today?</div>
                  <div className="previewChips">
                    <span>I have symptoms</span>
                    <span>Medicine refill</span>
                  </div>
                </div>
                <div className="previewTyping">
                  <span className="typingDot" />
                  <span className="typingDot" />
                  <span className="typingDot" />
                  CareConnect is typing…
                </div>
              </div>
            </div>
          </div>
          <div className="floatingCard card1">
            <span className="fcIcon">✓</span>
            <div>
              <strong>Triage complete</strong>
              <span>Moderate • Doctor consult recommended</span>
            </div>
          </div>
          <div className="floatingCard card2">
            <span className="fcIcon">🏠</span>
            <div>
              <strong>Dr. Meera booked</strong>
              <span>Home visit • Today 4:30 PM</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="sectionHead">
          <span className="sectionTag">Why CareConnect</span>
          <h2>Built for real families, real urgency</h2>
          <p>Every feature is designed around how people actually seek care at home—not how hospitals wish they would.</p>
        </div>
        <div className="featureGrid">
          {FEATURES.map((f) => (
            <article key={f.title} className="featureCard">
              <div className="featureIcon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section alt" id="how">
        <div className="sectionHead">
          <span className="sectionTag">How it works</span>
          <h2>From &ldquo;I don&apos;t feel well&rdquo; to booked—in 3 steps</h2>
        </div>
        <div className="stepsRow">
          {STEPS.map((s, i) => (
            <article key={s.num} className="stepCard">
              <div className="stepNum">{s.num}</div>
              {i < STEPS.length - 1 ? <div className="stepLine" aria-hidden="true" /> : null}
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
        <div className="sectionCta">
          <button className="btnPrimary" type="button" onClick={onStartChat}>
            Try the live demo
          </button>
        </div>
      </section>

      <section className="section" id="trust">
        <div className="trustGrid">
          <div className="trustCopy">
            <span className="sectionTag">Patient stories</span>
            <h2>Care that shows up when it matters</h2>
            <p>
              Thousands of families use CareConnect for fever checks, post-surgery nurse care, medicine refills,
              and late-night peace of mind.
            </p>
            <ul className="trustList">
              <li>HIPAA-minded data handling</li>
              <li>Verified clinician network</li>
              <li>24/7 emergency escalation</li>
              <li>Consent-first health history</li>
            </ul>
          </div>
          <div className="testimonialStack">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="testimonial">
                <p>&ldquo;{t.quote}&rdquo;</p>
                <footer>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="ctaBanner">
        <div className="ctaInner">
          <div>
            <h2>Ready to feel better—safely?</h2>
            <p>Launch the live demo. No signup. Real triage engine. Book a doctor in under 5 minutes.</p>
          </div>
          <button className="btnPrimary light" type="button" onClick={onStartChat}>
            Open CareConnect now
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="footerBrand">
          <span className="logoMark sm">CC</span>
          <span>CareConnect Health</span>
        </div>
        <p className="footerNote">
          Not for emergencies. If you are in immediate danger, call local emergency services.
        </p>
        <p className="footerCopy">© {new Date().getFullYear()} CareConnect. Demo project.</p>
      </footer>
    </div>
  );
}
